
'use server';

import { z } from 'zod';
import type { DirectMessage, User } from '@/types';
import { database } from '@/lib/firebase';
import { ref, set, get, remove, push, query, orderByChild, equalTo, orderByKey } from 'firebase/database';

// For sender names, use AuthProvider.MOCK_USERS_ARRAY_FOR_SELECT or fetch from Firebase
async function getUsersListForDisplay(): Promise<User[]> {
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
        return Object.values(snapshot.val() as Record<string, User>);
    }
    return [];
}

const SendDirectMessageSchema = z.object({
  recipientUserId: z.string().min(1, "Recipient must be selected."),
  message: z.string().min(1, "Message cannot be empty."),
});

export async function sendDirectMessageAction(
  senderId: string,
  prevState: any,
  formData: FormData
) {
  const allUsers = await getUsersListForDisplay();
  const sender = allUsers.find(u => u.id === senderId);
  if (!sender) {
    return { message: 'Sender not authenticated', errors: null, sentMessage: null };
  }

  const rawFormData = Object.fromEntries(formData.entries());
  const parsed = SendDirectMessageSchema.safeParse(rawFormData);

  if (!parsed.data) {
    return { message: 'Invalid data', errors: parsed.error.flatten().fieldErrors, sentMessage: null };
  }

  const { recipientUserId, message } = parsed.data;
  
  const isReply = !sender.isAdmin; 
  const actualRecipientId = isReply ? 'admin-1' : recipientUserId; // Assuming 'admin-1' is the main admin ID

  try {
    const dmsRef = ref(database, 'directMessages');
    const newDmRef = push(dmsRef);
    const dmId = newDmRef.key;
    if (!dmId) throw new Error("Failed to generate DM ID.");

    const newDirectMessageData: Omit<DirectMessage, 'id'> = {
      senderId,
      recipientId: actualRecipientId,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      isReply,
    };
    await set(newDmRef, newDirectMessageData);
    const sentMessage: DirectMessage = { id: dmId, ...newDirectMessageData };
    return { message: 'Message sent successfully', sentMessage, errors: null };
  } catch (error) {
    console.error("Error sending direct message:", error);
    return { message: 'Failed to send message', errors: null, sentMessage: null };
  }
}

export async function getDirectMessagesForUserAction(userId: string, contactId: string): Promise<DirectMessage[]> {
  try {
    const dmsRef = ref(database, 'directMessages');
    // This query is complex for Realtime DB. Fetch all and filter, or denormalize.
    // For simplicity, fetching all and filtering. Not efficient for large datasets.
    const snapshot = await get(query(dmsRef, orderByKey())); 
    if (snapshot.exists()) {
      const dmsData = snapshot.val();
      const allDms: DirectMessage[] = Object.keys(dmsData).map(key => ({
        id: key,
        ...dmsData[key],
      }));
      return allDms
        .filter(dm => 
          (dm.senderId === userId && dm.recipientId === contactId) ||
          (dm.senderId === contactId && dm.recipientId === userId)
        )
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
    return [];
  } catch (error) {
    console.error("Error fetching DMs for user:", error);
    return [];
  }
}

export async function getUnreadMessagesCountAction(userId: string): Promise<number> {
  try {
    const dmsRef = ref(database, 'directMessages');
    const q = query(dmsRef, orderByChild('recipientId'), equalTo(userId));
    const snapshot = await get(q);
    if (snapshot.exists()) {
      const dmsData = snapshot.val();
      return Object.values(dmsData as Record<string, DirectMessage>).filter(dm => !dm.read).length;
    }
    return 0;
  } catch (error) {
    console.error("Error getting unread DMs count:", error);
    return 0;
  }
}

export async function markMessagesAsReadAction(userId: string, contactId: string): Promise<{ success: boolean, message?: string }> {
  try {
    const dmsRef = ref(database, 'directMessages');
    // Fetch messages, then update. This is not atomic.
    const snapshot = await get(query(dmsRef, orderByKey())); // Fetch all and filter
    if (snapshot.exists()) {
      const dmsData = snapshot.val();
      let marked = false;
      const updates: Record<string, any> = {};
      for (const key in dmsData) {
        const dm = dmsData[key] as DirectMessage;
        if (dm.recipientId === userId && dm.senderId === contactId && !dm.read) {
          updates[`directMessages/${key}/read`] = true;
          marked = true;
        }
      }
      if (marked) {
        await set(ref(database), { ...updates }); // This will perform multi-path update if updates object is structured correctly relative to root. Or use update()
      }
      return { success: marked, message: marked ? "Messages marked as read." : "No new messages to mark." };
    }
    return { success: false, message: "No messages found."};
  } catch (error) {
    console.error("Error marking DMs as read:", error);
    return { success: false, message: "Failed to mark messages as read."};
  }
}

export async function replyToAdminAction(
  userId: string,
  message: string
): Promise<{ success: boolean, message?: string, sentMessage?: DirectMessage }> {
  const allUsers = await getUsersListForDisplay();
  const user = allUsers.find(u => u.id === userId);
  if (!user || user.isAdmin) {
    return { success: false, message: 'User not found or not authorized.' };
  }
  if (!message.trim()) {
    return { success: false, message: 'Reply cannot be empty.' };
  }

  try {
    const dmsRef = ref(database, 'directMessages');
    const newReplyRef = push(dmsRef);
    const replyId = newReplyRef.key;
    if (!replyId) throw new Error("Failed to generate reply ID.");

    const newReplyMessageData: Omit<DirectMessage, 'id'> = {
      senderId: userId,
      recipientId: 'admin-1', // Main admin ID
      message,
      timestamp: new Date().toISOString(),
      read: false,
      isReply: true,
    };
    await set(newReplyRef, newReplyMessageData);
    const sentMessage: DirectMessage = { id: replyId, ...newReplyMessageData };
    return { success: true, message: 'Reply sent successfully', sentMessage };
  } catch (error) {
    console.error("Error sending reply to admin:", error);
    return { success: false, message: 'Failed to send reply.' };
  }
}

export async function getAllUserConversationsAction(adminId: string): Promise<Record<string, DirectMessage[]>> {
  const allUsers = await getUsersListForDisplay();
  const adminUser = allUsers.find(u => u.id === adminId);
  if (!adminUser || !adminUser.isAdmin) return {};

  const conversations: Record<string, DirectMessage[]> = {};
  const nonAdminUsers = allUsers.filter(u => !u.isAdmin);

  try {
    const dmsRef = ref(database, 'directMessages');
    const snapshot = await get(query(dmsRef, orderByKey())); // Fetch all
    if (snapshot.exists()) {
      const allDms: DirectMessage[] = Object.values(snapshot.val());
      for (const user of nonAdminUsers) {
        const userMessages = allDms.filter(
            dm => (dm.senderId === user.id && dm.recipientId === adminId) || 
                  (dm.senderId === adminId && dm.recipientId === user.id)
        ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        if (userMessages.length > 0) {
            conversations[user.id] = userMessages;
        }
      }
    }
    return conversations;
  } catch (error) {
    console.error("Error getting all user conversations:", error);
    return {};
  }
}
