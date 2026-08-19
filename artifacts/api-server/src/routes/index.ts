import { Router, type IRouter } from "express";
import adminRouter from "./admin";
import authRouter from "./auth";
import healthRouter from "./health";
import membersRouter from "./members";
import postsRouter from "./posts";
import uploadRouter from "./upload";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(adminRouter);
router.use(membersRouter);
router.use(postsRouter);
router.use(uploadRouter);

export default router;
