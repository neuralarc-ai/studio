
'use server';

import { z } from 'zod';
import type { Task, TaskStatus, User, Project } from '@/types';
import { database } from '@/lib/firebase';
import { ref, set, get, remove, push, query, orderByChild, equalTo, orderByKey } from 'firebase/database';
import { MOCK_USERS_ARRAY_FOR_SELECT } from '@/context/auth-context'; // We will use this for names

// This function needs to access user data from Firebase if MOCK_USERS_ARRAY is not maintained globally.
// For simplicity, we will assume MOCK_USERS_ARRAY_FOR_SELECT is available from AuthContext for display names.
// A better approach would be to fetch user details as needed from Firebase.
async function getUsersListForEnrichment(): Promise<User[]> {
    // In a real scenario, you'd fetch this from Firebase '/users'
    // For now, we rely on the AuthProvider's MOCK_USERS_ARRAY_FOR_SELECT
    // This is a simplification.
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
        return Object.values(snapshot.val() as Record<string, User>);
    }
    return [];
}


const NO_PROJECT_SENTINEL = "_NO_PROJECT_";

const AddTaskSchema = z.object({
  title: z.string().min(1, "Task title is required."),
  description: z.string().optional(),
  referenceUrl: z.string().url().optional().or(z.literal('')),
  assignedToUserIds: z.array(z.string().min(1)).min(1, "Please assign the task to at least one user."),
  dueDate: z.string().datetime().optional().or(z.literal('')),
  status: z.enum(["To Do", "In Progress", "Completed", "Blocked"]),
  projectId: z.string().optional().transform(val => (val === NO_PROJECT_SENTINEL || val === '') ? undefined : val),
});

async function enrichTaskWithDetails(task: Task, allUsers: User[], allProjects: Project[]): Promise<Task> {
  const assignedToUsers = allUsers.filter(u => task.assignedToUserIds.includes(u.id));
  const assignedByUser = allUsers.find(u => u.id === task.assignedByUserId);
  const project = task.projectId ? allProjects.find(p => p.id === task.projectId) : undefined;
  
  return {
    ...task,
    assignedToUserNames: assignedToUsers.map(u => u.name),
    assignedByUserName: assignedByUser?.name || task.assignedByUserId,
    projectName: project?.name,
  };
}

// Helper to fetch all projects (used for enrichment)
async function getAllProjects(): Promise<Project[]> {
  const projectsRef = ref(database, 'projects');
  const snapshot = await get(projectsRef);
  if (snapshot.exists()) {
    const projectsData = snapshot.val();
    return Object.keys(projectsData).map(key => ({ id: key, ...projectsData[key] }));
  }
  return [];
}


export async function getTasksForAdminAction(adminId: string): Promise<Task[]> {
  // Assuming adminId 'admin-1' has special privileges for fetching users and projects
  // In a real app, role verification would be more robust.
  const currentAdmin = (await getUsersListForEnrichment()).find(u => u.id === adminId);
  if (!currentAdmin || !currentAdmin.isAdmin) return [];

  try {
    const tasksRef = ref(database, 'tasks');
    const tasksSnapshot = await get(query(tasksRef, orderByKey())); // Get all tasks
    
    const allUsers = await getUsersListForEnrichment();
    const allProjects = await getAllProjects();

    if (tasksSnapshot.exists()) {
      const tasksData = tasksSnapshot.val();
      const tasksArray: Task[] = await Promise.all(
        Object.keys(tasksData).map(async key => 
          enrichTaskWithDetails({ id: key, ...tasksData[key] }, allUsers, allProjects)
        )
      );
      return tasksArray.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [];
  } catch (error) {
    console.error("Error fetching admin tasks:", error);
    return [];
  }
}

export async function getTasksForUserAction(userId: string): Promise<Task[]> {
 try {
    const tasksRef = ref(database, 'tasks');
    // Firebase Realtime DB doesn't support array_contains queries directly.
    // We need to fetch all tasks and filter, or structure data differently (e.g., /userTasks/{userId}/{taskId})
    // For simplicity, fetching all and filtering. This is not scalable for many tasks.
    const tasksSnapshot = await get(query(tasksRef, orderByKey()));

    const allUsers = await getUsersListForEnrichment();
    const allProjects = await getAllProjects();

    if (tasksSnapshot.exists()) {
      const tasksData = tasksSnapshot.val();
      const userTasks: Task[] = [];
      for (const key in tasksData) {
        const task = { id: key, ...tasksData[key] };
        if (task.assignedToUserIds && task.assignedToUserIds.includes(userId)) {
          userTasks.push(await enrichTaskWithDetails(task, allUsers, allProjects));
        }
      }
      return userTasks.sort((a, b) => {
        const statusOrder: Record<TaskStatus, number> = { "To Do": 1, "In Progress": 2, "Blocked": 3, "Completed": 4 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    }
    return [];
  } catch (error) {
    console.error("Error fetching user tasks:", error);
    return [];
  }
}

export async function addTaskAction(creatorId: string, prevState: any, formData: FormData) {
  const creator = (await getUsersListForEnrichment()).find(u => u.id === creatorId);
  if (!creator) { 
    return { message: 'User not authenticated for task creation', errors: null, task: null };
  }

  const rawFormData = {
    title: formData.get('title'),
    description: formData.get('description'),
    referenceUrl: formData.get('referenceUrl'),
    assignedToUserIds: formData.getAll('assignedToUserIds'), 
    dueDate: formData.get('dueDate') === '' ? undefined : formData.get('dueDate'),
    status: formData.get('status'),
    projectId: formData.get('projectId'),
  };
  
  const parsed = AddTaskSchema.safeParse(rawFormData);

  if (!parsed.data) {
    return { message: 'Invalid task data', errors: parsed.error.flatten().fieldErrors, task: null };
  }

  const { title, description, referenceUrl, assignedToUserIds, dueDate, status, projectId } = parsed.data;

  try {
    const tasksRef = ref(database, 'tasks');
    const newTaskRef = push(tasksRef);
    const taskId = newTaskRef.key;
    if (!taskId) throw new Error("Failed to generate task ID.");

    const newTaskData: Omit<Task, 'id' | 'assignedToUserNames' | 'assignedByUserName' | 'projectName'> = {
      title,
      description,
      referenceUrl: referenceUrl || undefined,
      assignedToUserIds, 
      assignedByUserId: creatorId, 
      createdAt: new Date().toISOString(),
      dueDate,
      status,
      projectId: projectId || undefined, 
    };
    await set(newTaskRef, newTaskData);
    
    const allUsers = await getUsersListForEnrichment();
    const allProjects = await getAllProjects();
    const enrichedNewTask = await enrichTaskWithDetails({ id: taskId, ...newTaskData }, allUsers, allProjects);

    return { message: 'Task added successfully', task: enrichedNewTask, errors: null };
  } catch (error) {
    console.error("Error adding task:", error);
    return { message: 'Failed to add task', errors: null, task: null };
  }
}

export async function updateTaskStatusAction(taskId: string, newStatus: TaskStatus, currentUserId: string): Promise<{ success: boolean, message?: string, task?: Task }> {
  try {
    const taskRef = ref(database, `tasks/${taskId}`);
    const snapshot = await get(taskRef);
    if (!snapshot.exists()) {
      return { success: false, message: 'Task not found.' };
    }
    const taskData = snapshot.val() as Task;
    
    const currentUser = (await getUsersListForEnrichment()).find(u => u.id === currentUserId);
    if (!taskData.assignedToUserIds.includes(currentUserId) && !currentUser?.isAdmin) {
       return { success: false, message: 'Not authorized to update this task.' };
    }

    await set(taskRef, { ...taskData, status: newStatus });
    
    const allUsers = await getUsersListForEnrichment();
    const allProjects = await getAllProjects();
    const updatedTask = await enrichTaskWithDetails({ ...taskData, id: taskId, status: newStatus }, allUsers, allProjects);

    return { success: true, message: `Task status updated to ${newStatus}.`, task: updatedTask };
  } catch (error) {
    console.error("Error updating task status:", error);
    return { success: false, message: 'Failed to update task status.' };
  }
}

export async function deleteTaskAction(taskId: string, currentUserId: string): Promise<{ success: boolean, message?: string }> {
  const currentUser = (await getUsersListForEnrichment()).find(u => u.id === currentUserId);
  if (!currentUser || !currentUser.isAdmin) {
     return { success: false, message: 'Unauthorized action. Only admins can delete tasks.'};
  }
  try {
    await remove(ref(database, `tasks/${taskId}`));
    return { success: true, message: 'Task deleted.' };
  } catch (error) {
    console.error("Error deleting task:", error);
    return { success: false, message: 'Failed to delete task.' };
  }
}
