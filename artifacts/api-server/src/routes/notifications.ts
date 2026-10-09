import { Router, type IRouter } from "express";
import { attachUser, getUser, requireAuth } from "../lib/auth";
import { store } from "../lib/store";

const router: IRouter = Router();
router.use(attachUser);

router.get("/notifications", requireAuth, (req, res) => {
  const notifications = store.listNotifications(getUser(req)!.id);
  res.json({
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
  });
});

router.post("/notifications/:id/read", requireAuth, (req, res) => {
  store.markNotificationRead(getUser(req)!.id, String(req.params.id));
  res.json({ ok: true });
});

router.post("/notifications/read-all", requireAuth, (req, res) => {
  store.markAllNotificationsRead(getUser(req)!.id);
  res.json({ ok: true });
});

export default router;
