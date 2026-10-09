import { Router, type IRouter } from "express";
import { attachUser, getUser, requireRole } from "../lib/auth";
import { computePriority, categories, type Category, type Priority } from "../lib/priority";
import { store, type Report, type Severity, type Status } from "../lib/store";

const router: IRouter = Router();
router.use(attachUser);

const MAX_IMAGE_DATA_URL_LENGTH = 8 * 1024 * 1024;
const severities: Severity[] = ["low", "medium", "high", "unknown"];
const priorities: Priority[] = ["high", "medium", "low"];
const teams = [
  "Road Maintenance - North",
  "Road Maintenance - Central",
  "Road Maintenance - South",
  "Emergency Response",
];

function notifyReporter(report: Report, title: string, body: string) {
  store.createNotification({
    userId: report.reporterId,
    title,
    body,
    reportId: report.id,
    ticketId: report.ticketId,
  });
}

router.post("/reports", requireRole("reporter"), (req, res) => {
  const body = req.body as Record<string, unknown>;
  const photo = typeof body?.photo === "string" ? body.photo : "";
  const location = typeof body?.location === "string" ? body.location.trim() : "";
  const landmark = typeof body?.landmark === "string" ? body.landmark.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const category = body?.category as Category;

  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(photo) || photo.length > MAX_IMAGE_DATA_URL_LENGTH) {
    res.status(400).json({ error: "A valid photo (JPEG, PNG, or WebP under 6 MiB) is required." });
    return;
  }
  if (location.length < 3 || location.length > 200) {
    res.status(400).json({ error: "Enter a location between 3 and 200 characters." });
    return;
  }
  if (!categories.includes(category)) {
    res.status(400).json({ error: "Choose where the pothole is located." });
    return;
  }
  if (description.length > 1000) {
    res.status(400).json({ error: "Keep the description under 1000 characters." });
    return;
  }

  const analysis = (body?.analysis ?? {}) as Record<string, unknown>;
  const aiSeverity = severities.includes(analysis.severity as Severity)
    ? (analysis.severity as Severity)
    : "unknown";
  const aiConfidence =
    typeof analysis.confidence === "number" && analysis.confidence >= 0 && analysis.confidence <= 1
      ? analysis.confidence
      : null;

  const { priority, reason } = computePriority(category);

  const report = store.createReport({
    reporterId: getUser(req)!.id,
    reporterName: getUser(req)!.name,
    photo,
    location,
    landmark: landmark.slice(0, 200),
    category,
    description,
    isPothole: analysis.isPothole !== false,
    aiSeverity,
    aiConfidence,
    aiReason: typeof analysis.reason === "string" ? analysis.reason.slice(0, 500) : "",
    needsManualReview: analysis.needsManualReview === true || aiSeverity === "unknown",
    severity: aiSeverity,
    priority,
    priorityReason: reason,
    status: "Submitted",
    assignedTeam: "",
    officerNotes: "",
  });

  for (const user of store.users) {
    if (user.role !== "officer") continue;
    store.createNotification({
      userId: user.id,
      title: `New ${priority} priority report`,
      body: `${report.ticketId} reported at ${report.location} by ${report.reporterName}.`,
      reportId: report.id,
      ticketId: report.ticketId,
    });
  }

  res.status(201).json({ report });
});

router.get("/reports/mine", requireRole("reporter"), (req, res) => {
  res.json({ reports: store.listReportsByReporter(getUser(req)!.id) });
});

router.get("/reports", requireRole("officer"), (req, res) => {
  res.json({ reports: store.listReports(), teams });
});

router.patch("/reports/:id", requireRole("officer"), (req, res) => {
  const report = store.findReport(String(req.params.id));
  if (!report) {
    res.status(404).json({ error: "Report not found." });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const officer = getUser(req)!;

  if (body.status !== undefined) {
    const next = body.status as Status;
    const order: Status[] = ["Submitted", "In Progress", "Resolved"];
    if (!order.includes(next)) {
      res.status(400).json({ error: "Invalid status." });
      return;
    }
    if (next === report.status) {
      // No-op; allow other fields to update below.
    } else if (order.indexOf(next) <= order.indexOf(report.status)) {
      res.status(400).json({ error: `Cannot move a report backwards from ${report.status} to ${next}.` });
      return;
    } else {
      if (next === "Resolved" && report.status !== "In Progress") {
        res.status(400).json({ error: "Move the report to In Progress before resolving it." });
        return;
      }
      report.status = next;
      report.statusHistory.push({ status: next, at: new Date().toISOString(), by: officer.name });
      notifyReporter(
        report,
        next === "In Progress" ? "Repair in progress" : "Report resolved",
        next === "In Progress"
          ? `Your report ${report.ticketId} at ${report.location} is now In Progress.`
          : `Your report ${report.ticketId} at ${report.location} was marked Resolved. Thank you for reporting.`,
      );
    }
  }

  if (body.priority !== undefined) {
    const priority = body.priority as Priority;
    if (!priorities.includes(priority)) {
      res.status(400).json({ error: "Invalid priority." });
      return;
    }
    if (priority !== report.priority) {
      report.priority = priority;
      report.priorityReason = `Set manually by ${officer.name}.`;
    }
  }

  if (body.assignedTeam !== undefined) {
    const team = typeof body.assignedTeam === "string" ? body.assignedTeam : "";
    if (team && !teams.includes(team)) {
      res.status(400).json({ error: "Unknown maintenance team." });
      return;
    }
    if (team !== report.assignedTeam) {
      report.assignedTeam = team;
      if (team) {
        notifyReporter(
          report,
          "Crew assigned",
          `${team} has been assigned to your report ${report.ticketId} at ${report.location}.`,
        );
      }
    }
  }

  if (body.officerNotes !== undefined) {
    if (typeof body.officerNotes !== "string" || body.officerNotes.length > 1000) {
      res.status(400).json({ error: "Officer notes must be under 1000 characters." });
      return;
    }
    report.officerNotes = body.officerNotes.trim();
  }

  if (body.severity !== undefined) {
    const severity = body.severity as Severity;
    if (!severities.includes(severity)) {
      res.status(400).json({ error: "Invalid severity." });
      return;
    }
    report.severity = severity;
  }

  store.updateReport(report);
  res.json({ report });
});

export default router;
