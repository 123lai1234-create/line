import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import profileRouter from "./profile";
import broadcastsRouter from "./broadcasts";
import statsRouter from "./stats";
import lineWebhookRouter from "./line-webhook";
import debugRouter from "./debug";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(profileRouter);
router.use(broadcastsRouter);
router.use(statsRouter);
router.use(lineWebhookRouter);
router.use(debugRouter);

export default router;
