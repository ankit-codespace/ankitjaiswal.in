import { Router } from "express";
import { db } from "@workspace/db";
import { workLogs, insertWorkLogSchema } from "@workspace/db/schema";

const router = Router();

router.get("/work-logs", async (_req, res) => {
  const logs = await db.select().from(workLogs);
  res.json(logs);
});

router.post("/work-logs", async (req, res) => {
  try {
    const input = insertWorkLogSchema.parse(req.body);
    const [log] = await db.insert(workLogs).values(input).returning();
    res.status(201).json(log);
  } catch (err: any) {
    if (err.name === "ZodError") {
      res.status(400).json({
        message: err.errors?.[0]?.message || "Validation error",
      });
      return;
    }
    throw err;
  }
});

export default router;
