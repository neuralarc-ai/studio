
'use server';

import { z } from 'zod';
import type { AdminAnnouncement, User } from '@/types';
import { database } from '@/lib/firebase';
import { ref, set, get, remove, push, query, orderByChild, equalTo, orderByKey } from 'firebase/database';

// For user names, use AuthProvider.MOCK_USERS_ARRAY_FOR_SELECT or fetch from Firebase
async function getUsersListForDisplay(): Promise<User[]> {
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
        return Object.values(snapshot.val() as Record<string, User>);
    }
    return [];
}

const SendAnnouncementSchema = z.object({
  message: z.string().min(1, "Message cannot be empty."),
  recipientUserId: z.string().min(1, "Recipient must be selected."),
});

export async function sendAdminAnnouncementAction(
  adminUserId: string,
  adminName: string,
  prevState: any,
  formData: FormData
) {
  if (!adminUserId) { // In a real app, verify admin role from session/DB
    return { message: 'Admin not authenticated', errors: null, announcement: null };
  }

  const rawFormData = Object.fromEntries(formData.entries());
  const parsed = SendAnnouncementSchema.safeParse(rawFormData);

  if (!parsed.data) {
    return { message: 'Invalid data', errors: parsed.error.flatten().fieldErrors, announcement: null };
  }

  const { message, recipientUserId } = parsed.data;

  try {
    const announcementsRef = ref(database, 'adminAnnouncements');
    const newAnnouncementRef = push(announcementsRef);
    const announcementId = newAnnouncementRef.key;
    if (!announcementId) throw new Error("Failed to generate announcement ID.");

    const newAnnouncementData: Omit<AdminAnnouncement, 'id'> = {
      message,
      recipientUserId,
      sentByAdminName: adminName, // Should get this from authenticated admin user
      createdAt: new Date().toISOString(),
      readBy: {}, 
    };
    await set(newAnnouncementRef, newAnnouncementData);
    const announcementWithId: AdminAnnouncement = { id: announcementId, ...newAnnouncementData };
    return { message: 'Announcement sent successfully', announcement: announcementWithId, errors: null };
  } catch (error) {
    console.error("Error sending announcement:", error);
    return { message: 'Failed to send announcement', errors: null, announcement: null };
  }
}

export async function getAnnouncementsForUserAction(userId: string): Promise<AdminAnnouncement[]> {
  try {
    const announcementsRef = ref(database, 'adminAnnouncements');
    const snapshot = await get(query(announcementsRef, orderByKey())); // Get all, filter client-side for simplicity
    if (snapshot.exists()) {
      const announcementsData = snapshot.val();
      const allAnnouncements: AdminAnnouncement[] = Object.keys(announcementsData).map(key => ({
        id: key,
        ...announcementsData[key],
      }));
      return allAnnouncements
        .filter(anno => anno.recipientUserId === userId || anno.recipientUserId === 'all')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [];
  } catch (error) {
    console.error("Error fetching announcements for user:", error);
    return [];
  }
}

export async function getAllAnnouncementsAction(): Promise<AdminAnnouncement[]> {
  try {
    const announcementsRef = ref(database, 'adminAnnouncements');
    const snapshot = await get(query(announcementsRef, orderByKey()));
    if (snapshot.exists()) {
      const announcementsData = snapshot.val();
      const announcementsArray: AdminAnnouncement[] = Object.keys(announcementsData).map(key => ({
        id: key,
        ...announcementsData[key],
      }));
      return announcementsArray.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [];
  } catch (error) {
    console.error("Error fetching all announcements:", error);
    return [];
  }
}

export async function markAnnouncementReadAction(userId: string, announcementId: string): Promise<{ success: boolean, message?: string }> {
  try {
    const announcementRef = ref(database, `adminAnnouncements/${announcementId}`);
    const snapshot = await get(announcementRef);
    if (!snapshot.exists()) {
      return { success: false, message: "Announcement not found." };
    }
    const announcementData = snapshot.val() as AdminAnnouncement;
    if (announcementData.recipientUserId !== 'all' && announcementData.recipientUserId !== userId) {
      return { success: false, message: "This announcement was not intended for you."};
    }

    const readByRef = ref(database, `adminAnnouncements/${announcementId}/readBy/${userId}`);
    await set(readByRef, true);
    return { success: true, message: "Announcement marked as read." };
  } catch (error) {
    console.error("Error marking announcement read:", error);
    return { success: false, message: "Failed to mark announcement read." };
  }
}

export async function deleteAnnouncementAction(announcementId: string, adminId: string): Promise<{ success: boolean, message?: string }> {
  // In a real app, ensure adminId is valid and authorized via session or DB check
  try {
    await remove(ref(database, `adminAnnouncements/${announcementId}`));
    return { success: true, message: 'Announcement deleted.' };
  } catch (error) {
    console.error("Error deleting announcement:", error);
    return { success: false, message: 'Failed to delete announcement.' };
  }
}
