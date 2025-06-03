
export interface User {
  id: string;
  name: string; // Full name of the user
  email?: string; // User's email address
  pin: string; // Full PIN for authentication logic
  pinFirstTwo: string; // Derived from pin, for display hints
  isAdmin: boolean;
  createdAt: string;
  avatarUrl?: string; // URL to the user's profile image
}

export type ProjectStatus = "To Do" | "In Progress" | "Testing" | "Completed" | "Draft";

export interface Project {
  id: string;
  userId: string;
  name: string;
  type: string;
  status: ProjectStatus;
  link?: string;
  testLink?: string;
  documentUrl?: string;
  createdAt: string;
  completedAt?: string;
  description?: string;
  projectStarterId?: string; // Optional: ID of the starter used
}

export interface ProjectStarter {
  id: string;
  title: string;
  description: string;
  createdByAdminId: string;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  userId: string;
  keyName: string;
  keyValue: string;
  tag?: string;
  notes?: string;
  expiresAt?: string;
  createdAt: string;
  apiType?: string; // For AI suggested type
  integrationGuide?: string; // For AI suggested guide
}

export interface Reference {
  id: string;
  userId: string;
  link: string;
  title: string;
  notes?: string;
  tags?: string[];
  category?: string; // For AI auto-tagging
  aiSuggested?: boolean;
  createdAt: string;
}

export interface SuggestedResourceItem {
  name: string;
  description?: string;
  url?: string;
}

export interface ProjectResourceRecommendations {
  suggestedTools: SuggestedResourceItem[];
  caseStudies: SuggestedResourceItem[];
  referenceLinks: SuggestedResourceItem[];
  promptExamples: string[];
}

export interface ApiIntegrationSuggestion {
  apiType: string;
  integrationGuide: string;
}

export type AIModel = "OpenAI" | "Gemini" | "DeepSeek";

export type TaskStatus = "To Do" | "In Progress" | "Completed" | "Blocked";

export interface Task {
  id: string;
  title: string;
  description?: string;
  referenceUrl?: string;
  assignedToUserIds: string[]; // Changed from assignedToUserId
  assignedByUserId: string; // Admin who created the task
  createdAt: string;
  dueDate?: string;
  status: TaskStatus;
  assignedToUserNames?: string[]; // Changed from assignedToUserName
  assignedByUserName?: string; // For display purposes
  projectId?: string; // Optional: Link to a project
  projectName?: string; // Optional: For display
}

export interface AdminAnnouncement {
  id: string;
  message: string;
  recipientUserId: string | 'all'; // Specific user ID or 'all' for broadcast
  sentByAdminName: string;
  createdAt: string;
  readBy?: { [userId: string]: boolean }; // Tracks which users have read it
}

export interface DirectMessage {
  id: string;
  senderId: string; // 'admin-1' or a user ID
  recipientId: string; // a user ID or 'admin-1'
  message: string;
  timestamp: string;
  read: boolean;
  isReply: boolean; // true if it's a reply from user to admin
}

export interface MockAvatar {
  id: string;
  url: string;
  name: string; // e.g., "Geometric Spiral"
  aiHint: string;
}

// This type is now primarily for the output of leaderboard calculations
export interface UserPerformanceScore {
  userId: string;
  userName: string; 
  avatarUrl?: string; 
  score: number; // This will be the average or total monthly score
  rank?: number; 
}

// New types for detailed performance tracking
export interface WeeklyScoreRecord {
  weekStartDate: string; // ISO date string for the Friday starting the week
  score?: number | null; // 1-5, null or undefined if not yet entered
}

export interface MonthlyUserPerformance {
  userId: string;
  year: number;
  month: number; // 0-11 (Date object month format)
  weeklyScores: WeeklyScoreRecord[];
  // Denormalized fields, to be populated when fetching/calculating
  userName?: string;
  avatarUrl?: string;
  totalScore?: number;
  averageScore?: number;
  rank?: number;
}

// Placeholder for Email Server Settings
export interface EmailServerSettings {
  smtpServer?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string; // Would be securely handled in a real app
  smtpSecure?: boolean; // true for SSL/TLS
  fromEmail?: string;
}
