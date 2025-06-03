
'use server';

import { z } from 'zod';
import type { ApiKey, ApiIntegrationSuggestion } from '@/types';
import { suggestApiIntegrations } from '@/ai/flows/suggest-api-integrations';
import { database } from '@/lib/firebase';
import { ref, set, get, remove, push, query, orderByChild, equalTo, orderByKey } from 'firebase/database';

const AddApiKeySchema = z.object({
  keyName: z.string().min(1, "Key name is required."),
  keyValue: z.string().min(1, "Key value is required."),
  tag: z.string().optional(),
  notes: z.string().optional(),
  expiresAt: z.string().datetime().optional().or(z.literal('')),
});

export async function getApiKeysAction(userId: string): Promise<ApiKey[]> {
  try {
    const apiKeysRef = ref(database, 'apiKeys');
    let keysQuery;
    if (userId === 'admin-1') {
      keysQuery = query(apiKeysRef, orderByKey()); // Admin gets all
    } else {
      keysQuery = query(apiKeysRef, orderByChild('userId'), equalTo(userId));
    }
    const snapshot = await get(keysQuery);
    if (snapshot.exists()) {
      const keysData = snapshot.val();
      const keysArray: ApiKey[] = Object.keys(keysData).map(key => ({
        id: key,
        ...keysData[key],
      }));
      return keysArray.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [];
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return [];
  }
}

export async function addApiKeyAction(userId: string, prevState: any, formData: FormData) {
  if (!userId) {
    return { message: 'User not authenticated', errors: null, apiKey: null };
  }
  const rawFormData = Object.fromEntries(formData.entries());
  const parsed = AddApiKeySchema.safeParse({
    ...rawFormData,
    expiresAt: rawFormData.expiresAt === '' ? undefined : rawFormData.expiresAt,
  });

  if (!parsed.data) {
    return { message: 'Invalid data', errors: parsed.error.flatten().fieldErrors, apiKey: null };
  }

  const { keyName, keyValue, tag, notes, expiresAt } = parsed.data;

  try {
    const apiKeysRef = ref(database, 'apiKeys');
    const newApiKeyRef = push(apiKeysRef);
    const apiKeyId = newApiKeyRef.key;
    if (!apiKeyId) throw new Error("Failed to generate API Key ID.");

    // In a real app, encrypt keyValue before saving to DB
    const newApiKeyData: Omit<ApiKey, 'id'> = {
      userId: userId,
      keyName,
      keyValue, // This would be the encrypted value in a real app
      tag,
      notes,
      expiresAt: expiresAt || undefined,
      createdAt: new Date().toISOString(),
    };
    await set(newApiKeyRef, newApiKeyData);
    const apiKeyWithId: ApiKey = { id: apiKeyId, ...newApiKeyData };
    return { message: 'API Key added successfully', apiKey: apiKeyWithId, errors: null };
  } catch (error) {
    console.error("Error adding API key:", error);
    return { message: 'Failed to add API key', errors: null, apiKey: null };
  }
}

export async function deleteApiKeyAction(id: string, currentUserId?: string): Promise<{ success: boolean, message?: string }> {
  // Optional: Add RLS-like check, if currentUserId is provided
  // For now, assumes authorization is handled by who calls this (e.g., admin page or user deleting own key)
  try {
    const apiKeyRef = ref(database, `apiKeys/${id}`);
    // If currentUserId, you could fetch and check ownership before removing.
    // const snapshot = await get(apiKeyRef);
    // if (snapshot.exists() && snapshot.val().userId !== currentUserId && currentUserId !== 'admin-1') {
    //   return { success: false, message: "Unauthorized to delete this key."}
    // }
    await remove(apiKeyRef);
    return { success: true, message: 'API Key deleted.' };
  } catch (error) {
    console.error("Error deleting API key:", error);
    return { success: false, message: 'Failed to delete API key.' };
  }
}

export async function suggestApiIntegrationAction(apiKeyId: string, keyName: string, keyValue: string): Promise<ApiIntegrationSuggestion> {
  try {
    const suggestion = await suggestApiIntegrations({ keyName, keyValue });
    
    // Save suggestion back to Firebase
    const apiKeyRef = ref(database, `apiKeys/${apiKeyId}`);
    const snapshot = await get(apiKeyRef);
    if (snapshot.exists()) {
      const apiKeyData = snapshot.val();
      await set(apiKeyRef, {
        ...apiKeyData,
        apiType: suggestion.apiType,
        integrationGuide: suggestion.integrationGuide,
      });
    }
    return suggestion;
  } catch (error) {
    console.error("AI suggestion for API integration failed:", error);
    throw new Error("Failed to get API integration suggestion.");
  }
}
