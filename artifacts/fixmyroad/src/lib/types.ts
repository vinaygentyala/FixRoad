export type Role = 'reporter' | 'officer';
export type Severity = 'low' | 'medium' | 'high' | 'unknown';
export type Priority = 'high' | 'medium' | 'low';
export type Status = 'Submitted' | 'In Progress' | 'Resolved';
export type Category = 'school' | 'hospital' | 'highway' | 'normal';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface StatusEntry {
  status: Status;
  at: string;
  by: string;
}

export interface Report {
  id: string;
  ticketId: string;
  reporterId: string;
  reporterName: string;
  photo: string;
  location: string;
  landmark: string;
  category: Category;
  description: string;
  isPothole: boolean;
  aiSeverity: Severity;
  aiConfidence: number | null;
  aiReason: string;
  needsManualReview: boolean;
  severity: Severity;
  priority: Priority;
  priorityReason: string;
  status: Status;
  assignedTeam: string;
  officerNotes: string;
  statusHistory: StatusEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  reportId: string;
  ticketId: string;
  read: boolean;
  createdAt: string;
}

export interface AnalysisResult {
  is_pothole: boolean;
  severity: Severity;
  confidence: number | null;
  reason: string;
  needs_manual_review: boolean;
}
