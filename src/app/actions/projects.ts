
'use server';

import { z } from 'zod';
import type { Project, ProjectResourceRecommendations, SuggestedResourceItem, ProjectStatus, ProjectStarter } from '@/types';
import { recommendProjectResources } from '@/ai/flows/recommend-project-resources';
import { database } from '@/lib/firebase';
import { ref, set, get, remove, push, serverTimestamp, query, orderByChild, equalTo, orderByKey } from 'firebase/database';

const projectStatuses: ProjectStatus[] = ["Draft", "To Do", "In Progress", "Testing", "Completed"];
const NO_STARTER_SELECTED_SENTINEL_ACTION = "_NO_STARTER_";

const AddProjectSchema = z.object({
  name: z.string().min(1, "Project name is required."),
  type: z.string().min(1, "Project type is required."),
  status: z.enum(projectStatuses as [ProjectStatus, ...ProjectStatus[]]),
  link: z.string().url().optional().or(z.literal('')),
  testLink: z.string().url().optional().or(z.literal('')),
  documentUrl: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
  projectStarterId: z.string().optional()
    .transform(val => (val === NO_STARTER_SELECTED_SENTINEL_ACTION || val === '') ? undefined : val),
});

const AddProjectStarterSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().min(1, "Description is required."),
});

export async function getProjectsAction(userId: string): Promise<Project[]> {
  try {
    const projectsRef = ref(database, 'projects');
    let projectsQuery;
    if (userId === 'admin-1') { // Assuming 'admin-1' is the designated admin ID
      projectsQuery = query(projectsRef, orderByKey()); // Admin gets all, ordered by key (creation time)
    } else {
      projectsQuery = query(projectsRef, orderByChild('userId'), equalTo(userId));
    }
    const snapshot = await get(projectsQuery);
    if (snapshot.exists()) {
      const projectsData = snapshot.val();
      const projectsArray: Project[] = Object.keys(projectsData).map(key => ({
        id: key,
        ...projectsData[key],
      }));
      return projectsArray.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [];
  } catch (error) {
    console.error("Error fetching projects:", error);
    return [];
  }
}

export async function addProjectAction(userId: string, prevState: any, formData: FormData) {
  if (!userId) {
    return { message: 'User not authenticated', errors: null, project: null };
  }
  const rawFormData = Object.fromEntries(formData.entries());
  const parsed = AddProjectSchema.safeParse(rawFormData);

  if (!parsed.data) {
    return { message: 'Invalid data', errors: parsed.error.flatten().fieldErrors, project: null };
  }

  const { name, type, status, link, testLink, documentUrl, description, projectStarterId } = parsed.data;

  try {
    const projectsRef = ref(database, 'projects');
    const newProjectRef = push(projectsRef); // Generate a unique ID
    const projectId = newProjectRef.key;

    if (!projectId) {
      throw new Error("Failed to generate project ID.");
    }
    
    const newProjectData: Omit<Project, 'id'> = {
      userId: userId,
      name,
      type,
      status,
      link: link || undefined,
      testLink: testLink || undefined,
      documentUrl: documentUrl || undefined,
      description,
      projectStarterId: projectStarterId || undefined,
      createdAt: new Date().toISOString(), // Client-side timestamp for consistency, serverTimestamp for Firebase
      ...(status === 'Completed' && { completedAt: new Date().toISOString() }),
    };

    await set(newProjectRef, newProjectData);
    const projectWithId: Project = { id: projectId, ...newProjectData };
    return { message: 'Project added successfully', project: projectWithId, errors: null };
  } catch (error) {
    console.error("Error adding project:", error);
    return { message: 'Failed to add project to database', errors: null, project: null };
  }
}

export async function updateProjectStatusAction(projectId: string, newStatus: ProjectStatus, userId: string): Promise<{ success: boolean, message?: string, project?: Project }> {
  try {
    const projectRef = ref(database, `projects/${projectId}`);
    const snapshot = await get(projectRef);
    if (!snapshot.exists()) {
      return { success: false, message: 'Project not found.' };
    }
    const projectData = snapshot.val() as Project;

    if (projectData.userId !== userId && userId !== 'admin-1') {
      return { success: false, message: 'Unauthorized to update this project.' };
    }

    const updates: Partial<Project> = { status: newStatus };
    if (newStatus === 'Completed' && !projectData.completedAt) {
      updates.completedAt = new Date().toISOString();
    } else if (newStatus !== 'Completed') {
      updates.completedAt = undefined; // Firebase handles undefined by removing the field
    }

    await set(projectRef, { ...projectData, ...updates });
    return { success: true, message: 'Project status updated.', project: { ...projectData, ...updates, id: projectId } };
  } catch (error) {
    console.error("Error updating project status:", error);
    return { success: false, message: 'Failed to update project status.' };
  }
}

export async function deleteProjectAction(id: string): Promise<{ success: boolean, message?: string }> {
  try {
    const projectRef = ref(database, `projects/${id}`);
    await remove(projectRef);
    return { success: true, message: 'Project deleted.' };
  } catch (error) {
    console.error("Error deleting project:", error);
    return { success: false, message: 'Failed to delete project.' };
  }
}

export async function recommendProjectResourcesAction(projectType: string): Promise<ProjectResourceRecommendations> {
  try {
    const aiResponse = await recommendProjectResources({ projectType });
    const transformToItems = (items: string[], type: string): SuggestedResourceItem[] => items.map(item => {
      const parts = item.split(': ');
      if (parts.length > 1 && type === 'caseStudies') {
        return { name: parts[0], description: parts.slice(1).join(': ') };
      }
      return { name: item, url: item.startsWith('http') ? item : undefined };
    });

    return {
      suggestedTools: transformToItems(aiResponse.suggestedTools, 'tools'),
      caseStudies: transformToItems(aiResponse.caseStudies, 'caseStudies'),
      referenceLinks: transformToItems(aiResponse.referenceLinks, 'referenceLinks'),
      promptExamples: aiResponse.promptExamples,
    };
  } catch (error) {
    console.error("AI recommendation for project resources failed:", error);
    throw new Error("Failed to get project resource recommendations.");
  }
}

export async function getProjectStartersAction(): Promise<ProjectStarter[]> {
  try {
    const startersRef = ref(database, 'projectStarters');
    const snapshot = await get(startersRef);
    if (snapshot.exists()) {
      const startersData = snapshot.val();
      const startersArray: ProjectStarter[] = Object.keys(startersData).map(key => ({
        id: key,
        ...startersData[key],
      }));
      return startersArray.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [];
  } catch (error) {
    console.error("Error fetching project starters:", error);
    return [];
  }
}

export async function addProjectStarterAction(adminId: string, prevState: any, formData: FormData) {
  if (!adminId) {
    return { message: 'Admin not authenticated', errors: null, starter: null };
  }
  const rawFormData = Object.fromEntries(formData.entries());
  const parsed = AddProjectStarterSchema.safeParse(rawFormData);

  if (!parsed.data) {
    return { message: 'Invalid data', errors: parsed.error.flatten().fieldErrors, starter: null };
  }

  const { title, description } = parsed.data;

  try {
    const startersRef = ref(database, 'projectStarters');
    const newStarterRef = push(startersRef);
    const starterId = newStarterRef.key;

    if (!starterId) {
        throw new Error("Failed to generate starter ID.");
    }

    const newStarterData: Omit<ProjectStarter, 'id'> = {
      title,
      description,
      createdByAdminId: adminId,
      createdAt: new Date().toISOString(),
    };
    await set(newStarterRef, newStarterData);
    const starterWithId: ProjectStarter = {id: starterId, ...newStarterData};
    return { message: 'Project starter added successfully', starter: starterWithId, errors: null };
  } catch (error) {
    console.error("Error adding project starter:", error);
    return { message: 'Failed to add project starter', errors: null, starter: null };
  }
}
