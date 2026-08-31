import { Router, type IRouter } from "express";
import adminRouter from "./admin";
import authRouter from "./auth";
import healthRouter from "./health";
import membersRouter from "./members";
import newsRouter from "./news";
import postsRouter from "./posts";
import sharesRouter from "./shares";
import socialAuthRouter from "./social-auth";
import uploadRouter from "./upload";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(socialAuthRouter);
router.use(adminRouter);
router.use(membersRouter);
router.use(newsRouter);
router.use(postsRouter);
router.use(sharesRouter);
router.use(uploadRouter);

export default router;
