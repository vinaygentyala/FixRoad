import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { computePriority, type Category, type Priority, type WeatherContext } from "./priority";

export type Role = "reporter" | "officer";
export type Severity = "low" | "medium" | "high" | "unknown";
export type Status = "Submitted" | "In Progress" | "Resolved";
export type { Category, Priority };

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
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
  weather?: WeatherContext;
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

interface Database {
  users: User[];
  sessions: Session[];
  reports: Report[];
  notifications: AppNotification[];
  meta: { ticketCounter: number };
}

const dataDir = path.resolve(process.cwd(), "data");
const dataFile = path.join(dataDir, "db.json");

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function isoDaysAgo(days: number, hour = 10): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 15, 0, 0);
  return date.toISOString();
}

function seed(): Database {
  const now = new Date().toISOString();
  const officer: User = {
    id: "user-officer-1",
    name: "Ananya Rao",
    email: "officer@fixmyroad.gov",
    passwordHash: hashPassword("officer123"),
    role: "officer",
    createdAt: isoDaysAgo(90),
  };
  const reporter: User = {
    id: "user-reporter-1",
    name: "Maya Iyer",
    email: "maya@example.com",
    passwordHash: hashPassword("reporter123"),
    role: "reporter",
    createdAt: isoDaysAgo(60),
  };

  const rows: Array<{
    ticket: string;
    location: string;
    landmark: string;
    category: Category;
    severity: Severity;
    status: Status;
    description: string;
    days: number;
    team?: string;
    notes?: string;
    reporterId?: string;
    reporterName?: string;
  }> = [
    {
      ticket: "FMR-10241",
      location: "Pine Street & 4th Avenue",
      landmark: "Opposite the metro station gate",
      category: "school",
      severity: "high",
      status: "In Progress",
      description: "Large crater in the eastbound lane near the school crossing, difficult to avoid during morning traffic.",
      days: 1,
      team: "Road Maintenance - Central",
      notes: "Inspection done. Repair crew scheduled.",
    },
    {
      ticket: "FMR-10236",
      location: "King Street outside number 128",
      landmark: "Beside the bus shelter",
      category: "highway",
      severity: "high",
      status: "In Progress",
      description: "Deep pothole beside the curb; standing water makes it hard to judge the depth.",
      days: 3,
      team: "Emergency Response",
      notes: "Barricades placed until resurfacing.",
    },
    {
      ticket: "FMR-10229",
      location: "Maple Road by Northside Library",
      landmark: "Right wheel track, northbound",
      category: "normal",
      severity: "medium",
      status: "Submitted",
      description: "Several small breaks forming in the right wheel track, getting worse after rain.",
      days: 2,
    },
    {
      ticket: "FMR-10222",
      location: "Cedar Avenue near the community garden",
      landmark: "Near the pedestrian crossing",
      category: "normal",
      severity: "medium",
      status: "Resolved",
      description: "Uneven patch has opened up again near the crossing.",
      days: 8,
      team: "Road Maintenance - South",
      notes: "Resurfaced and compacted. Verified on site.",
    },
    {
      ticket: "FMR-10217",
      location: "Market Street bus stop, westbound",
      landmark: "In front of the bus bay",
      category: "hospital",
      severity: "low",
      status: "In Progress",
      description: "Shallow road surface chip near the bus stop on the route to the city hospital.",
      days: 5,
      team: "Road Maintenance - North",
    },
    {
      ticket: "FMR-10211",
      location: "Oak Lane by Willow Primary School",
      landmark: "School crossing approach",
      category: "school",
      severity: "low",
      status: "Submitted",
      description: "Small depression forming near the school crossing.",
      days: 6,
    },
    {
      ticket: "FMR-10203",
      location: "Riverside Drive at Bridge Road",
      landmark: "Bridge approach, southbound",
      category: "highway",
      severity: "unknown",
      status: "Submitted",
      description: "Road damage reported after heavy rain; needs a field inspection.",
      days: 1,
    },
    {
      ticket: "FMR-10198",
      location: "Hillcrest Avenue near the roundabout",
      landmark: "Roundabout approach",
      category: "normal",
      severity: "unknown",
      status: "Resolved",
      description: "Surface damage on the approach to the roundabout.",
      days: 12,
      team: "Road Maintenance - Central",
      notes: "Patch completed and rolled.",
    },
  ];

  const reports: Report[] = rows.map((row, i) => {
    const createdAt = isoDaysAgo(row.days);
    const history: StatusEntry[] = [{ status: "Submitted", at: createdAt, by: row.reporterName ?? "Maya Iyer" }];
    if (row.status !== "Submitted") {
      history.push({ status: "In Progress", at: isoDaysAgo(Math.max(0, row.days - 1), 13), by: "Ananya Rao" });
    }
    if (row.status === "Resolved") {
      history.push({ status: "Resolved", at: isoDaysAgo(Math.max(0, row.days - 2), 16), by: "Ananya Rao" });
    }
    const { priority, reason } = computePriority(row.severity, undefined, row.category);
    return {
      id: `seed-report-${i + 1}`,
      ticketId: row.ticket,
      reporterId: row.reporterId ?? reporter.id,
      reporterName: row.reporterName ?? reporter.name,
      photo: `/sample-road-${row.severity}.svg`,
      location: row.location,
      landmark: row.landmark,
      category: row.category,
      description: row.description,
      isPothole: row.severity !== "unknown",
      aiSeverity: row.severity,
      aiConfidence: row.severity === "unknown" ? null : [0.94, 0.89, 0.82, 0.77, 0.91, 0.87, 0.72, 0.8][i] ?? null,
      aiReason:
        row.severity === "unknown"
          ? "Image unclear; a field inspection is recommended."
          : `Visible road-surface damage consistent with ${row.severity} severity.`,
      needsManualReview: row.severity === "unknown",
      severity: row.severity,
      priority,
      priorityReason: reason,
      status: row.status,
      assignedTeam: row.team ?? "",
      officerNotes: row.notes ?? "",
      statusHistory: history,
      createdAt,
      updatedAt: history[history.length - 1].at,
      weather: { available: false, source: "Not assessed for seeded report", assessedAt: createdAt, locationQuery: row.location, note: "Seed data has no location-specific weather assessment." },
    };
  });

  const notifications: AppNotification[] = [
    {
      id: "seed-notif-1",
      userId: reporter.id,
      title: "Repair in progress",
      body: "Your report FMR-10241 at Pine Street & 4th Avenue is now In Progress with Road Maintenance - Central.",
      reportId: "seed-report-1",
      ticketId: "FMR-10241",
      read: false,
      createdAt: isoDaysAgo(0, 9),
    },
    {
      id: "seed-notif-2",
      userId: reporter.id,
      title: "Report resolved",
      body: "FMR-10222 at Cedar Avenue near the community garden was marked Resolved. Thank you for reporting.",
      reportId: "seed-report-4",
      ticketId: "FMR-10222",
      read: true,
      createdAt: isoDaysAgo(6, 17),
    },
  ];

  return {
    users: [officer, reporter],
    sessions: [],
    reports,
    notifications,
    meta: { ticketCounter: 10242 },
  };
}

class Store {
  private db: Database;

  constructor() {
    mkdirSync(dataDir, { recursive: true });
    if (existsSync(dataFile)) {
      try {
        this.db = JSON.parse(readFileSync(dataFile, "utf8")) as Database;
        return;
      } catch {
        // Fall through to a fresh seed when the file is unreadable.
      }
    }
    this.db = seed();
    this.save();
  }

  private save() {
    writeFileSync(dataFile, JSON.stringify(this.db, null, 2));
  }

  get users() {
    return this.db.users;
  }

  findUserByEmail(email: string): User | undefined {
    const normalized = email.trim().toLowerCase();
    return this.db.users.find((u) => u.email === normalized);
  }

  findUserById(id: string): User | undefined {
    return this.db.users.find((u) => u.id === id);
  }

  createUser(input: { name: string; email: string; password: string; role: Role }): User {
    const user: User = {
      id: `user-${randomBytes(8).toString("hex")}`,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      passwordHash: hashPassword(input.password),
      role: input.role,
      createdAt: new Date().toISOString(),
    };
    this.db.users.push(user);
    this.save();
    return user;
  }

  updateUserName(userId: string, name: string): User | undefined {
    const user = this.findUserById(userId);
    if (!user) return undefined;
    user.name = name.trim();
    this.save();
    return user;
  }

  createSession(userId: string): Session {
    const session: Session = {
      token: randomBytes(32).toString("hex"),
      userId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    this.db.sessions = this.db.sessions.filter((s) => s.expiresAt > new Date().toISOString());
    this.db.sessions.push(session);
    this.save();
    return session;
  }

  findSession(token: string): Session | undefined {
    const session = this.db.sessions.find((s) => s.token === token);
    if (!session) return undefined;
    if (session.expiresAt <= new Date().toISOString()) {
      this.db.sessions = this.db.sessions.filter((s) => s.token !== token);
      this.save();
      return undefined;
    }
    return session;
  }

  deleteSession(token: string) {
    this.db.sessions = this.db.sessions.filter((s) => s.token !== token);
    this.save();
  }

  listReports(): Report[] {
    return [...this.db.reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  listReportsByReporter(reporterId: string): Report[] {
    return this.listReports().filter((r) => r.reporterId === reporterId);
  }

  findReport(id: string): Report | undefined {
    return this.db.reports.find((r) => r.id === id);
  }

  createReport(
    input: Omit<Report, "id" | "ticketId" | "createdAt" | "updatedAt" | "statusHistory">,
  ): Report {
    const now = new Date().toISOString();
    const ticketId = `FMR-${this.db.meta.ticketCounter++}`;
    const report: Report = {
      ...input,
      id: `report-${randomBytes(8).toString("hex")}`,
      ticketId,
      statusHistory: [{ status: input.status, at: now, by: input.reporterName }],
      createdAt: now,
      updatedAt: now,
    };
    this.db.reports.push(report);
    this.save();
    return report;
  }

  updateReport(report: Report) {
    report.updatedAt = new Date().toISOString();
    this.save();
  }

  listNotifications(userId: string): AppNotification[] {
    return this.db.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50);
  }

  createNotification(input: Omit<AppNotification, "id" | "read" | "createdAt">): AppNotification {
    const notification: AppNotification = {
      ...input,
      id: `notif-${randomBytes(8).toString("hex")}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.db.notifications.push(notification);
    this.save();
    return notification;
  }

  markNotificationRead(userId: string, id: string) {
    const notification = this.db.notifications.find((n) => n.id === id && n.userId === userId);
    if (notification) {
      notification.read = true;
      this.save();
    }
  }

  markAllNotificationsRead(userId: string) {
    for (const n of this.db.notifications) {
      if (n.userId === userId) n.read = true;
    }
    this.save();
  }
}

export const store = new Store();
