import { Router, type IRouter } from "express";
import healthRouter from "./health";
import workLogsRouter from "./work-logs";
import feedbackRouter from "./feedback";
import whoisRouter from "./whois";

const router: IRouter = Router();

router.use(healthRouter);
router.use(workLogsRouter);
router.use(feedbackRouter);
router.use(whoisRouter);

export default router;
