
'use server';

import { z } from 'zod';
import type { Reference } from '@/types';
import { autocompleteLinkTitle } from '@/ai/flows/autocomplete-link-title';
import { database } from '@/lib/firebase';
import { ref, set, get, remove, push, query, orderByChild, equalTo, orderByKey } from 'firebase/database';

const AddReferenceSchema = z.object({
  link: z.string().url({ message: "Invalid URL format." }),
  title: z.string().min(1, { message: "Title is required." }).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function getReferences(userId: string): Promise<Reference[]> {
  try {
    const referencesRef = ref(database, 'references');
    let refsQuery;
    if (userId === 'admin-1') { // Assuming 'admin-1' is the designated admin ID
      refsQuery = query(referencesRef, orderByKey());
    } else {
      refsQuery = query(referencesRef, orderByChild('userId'), equalTo(userId));
    }
    const snapshot = await get(refsQuery);
    if (snapshot.exists()) {
      const refsData = snapshot.val();
      const refsArray: Reference[] = Object.keys(refsData).map(key => ({
        id: key,
        ...refsData[key],
      }));
      return refsArray.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [];
  } catch (error) {
    console.error("Error fetching references:", error);
    return [];
  }
}

export async function addReferenceAction(userId: string, prevState: any, formData: FormData) {
  if (!userId) {
    return { message: 'User not authenticated', errors: null, reference: null };
  }

  const rawFormData = Object.fromEntries(formData.entries());
  const parsed = AddReferenceSchema.safeParse({
    ...rawFormData,
    tags: rawFormData.tags ? (rawFormData.tags as string).split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean) : [],
  });

  if (!parsed.data) {
    return { message: 'Invalid data', errors: parsed.error.flatten().fieldErrors, reference: null };
  }

  let { link, title, notes, tags } = parsed.data;

  if (!title && link) {
    try {
      const aiResponse = await autocompleteLinkTitle({ link });
      title = aiResponse.title;
    } catch (error) {
      console.error("AI title autocomplete failed:", error);
      // Continue, title will remain undefined if AI fails
    }
  }
  
  const category = link.includes('youtube.com') || link.includes('youtu.be') || link.includes('vimeo.com') ? 'Video' : 'Article';

  try {
    const referencesRef = ref(database, 'references');
    const newReferenceRef = push(referencesRef);
    const referenceId = newReferenceRef.key;
    if (!referenceId) throw new Error("Failed to generate reference ID.");

    const newReferenceData: Omit<Reference, 'id'> = {
      userId: userId,
      link,
      title: title || 'Untitled Reference',
      notes,
      tags,
      category,
      createdAt: new Date().toISOString(),
    };
    await set(newReferenceRef, newReferenceData);
    const referenceWithId: Reference = {id: referenceId, ...newReferenceData};
    return { message: 'Reference added successfully', reference: referenceWithId, errors: null };
  } catch (error) {
    console.error("Error adding reference:", error);
    return { message: 'Failed to add reference', errors: null, reference: null };
  }
}

export async function deleteReferenceAction(id: string, currentUserId?: string): Promise<{ success: boolean, message?: string }> {
   // Optional: RLS-like check if currentUserId is provided
  try {
    const referenceRef = ref(database, `references/${id}`);
    // const snapshot = await get(referenceRef);
    // if (snapshot.exists() && snapshot.val().userId !== currentUserId && currentUserId !== 'admin-1') {
    //   return { success: false, message: "Unauthorized to delete this reference."}
    // }
    await remove(referenceRef);
    return { success: true, message: 'Reference deleted.' };
  } catch (error) {
    console.error("Error deleting reference:", error);
    return { success: false, message: 'Failed to delete reference.' };
  }
}

export async function getAutocompleteTitle(link: string): Promise<{ title?: string, error?: string }> {
  if(!link || !z.string().url().safeParse(link).success) {
    return { error: "Invalid URL provided." };
  }
  try {
    const result = await autocompleteLinkTitle({ link });
    return { title: result.title };
  } catch (error) {
    console.error("Error autocompleting title:", error);
    return { error: "Failed to autocomplete title." };
  }
}

// AI Suggested References (Placeholder - will need a real AI flow and project context)
export async function getAISuggestedReferences(currentProjectId: string, userSavedLinks: Reference[]): Promise<Reference[]> {
  await new Promise(resolve => setTimeout(resolve, 500));
  return [
    // Mock data, replace with actual AI call
  ];
}
