import { Router, type IRouter } from "express";
import healthRouter from "./health";
import analysisRouter from "./analysis";
import authRouter from "./auth";
import reportsRouter from "./reports";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(analysisRouter);
router.use(authRouter);
router.use(reportsRouter);
router.use(notificationsRouter);

export default router;
