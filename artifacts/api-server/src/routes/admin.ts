import { Router, type IRouter } from "express";
import adminAnalyticsRouter from "./admin/analytics";
import adminLogsRouter from "./admin/logs";
import adminMembersRouter from "./admin/members";
import adminPostsRouter from "./admin/posts";
import adminSettingsRouter from "./admin/settings";

const router: IRouter = Router();

router.use(adminPostsRouter);
router.use(adminMembersRouter);
router.use(adminSettingsRouter);
router.use(adminAnalyticsRouter);
router.use(adminLogsRouter);

export default router;