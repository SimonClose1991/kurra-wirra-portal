import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, completionsTable, documentsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/requireAuth";

const router = Router();

router.get("/progress/summary", requireAdmin, async (req, res) => {
  try {
    const users = await db.select().from(usersTable);
    const documents = await db.select().from(documentsTable);
    const completions = await db.select().from(completionsTable);

    const totalUsers = users.filter(u => u.role === "staff").length;
    const totalDocuments = documents.length;
    const totalCompletions = completions.length;

    const fullyCompletedUsers = users.filter(user => {
      const userCompletions = completions.filter(c => c.clerkUserId === user.clerkUserId);
      return userCompletions.length >= totalDocuments && totalDocuments > 0;
    }).length;

    res.json({
      totalUsers,
      totalDocuments,
      totalCompletions,
      fullyCompletedUsers,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get progress summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
