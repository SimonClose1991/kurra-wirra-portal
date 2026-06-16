import { Router } from "express";
import { db } from "@workspace/db";
import { completionsTable, usersTable, documentsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/requireAuth";
import { CreateCompletionBody } from "@workspace/api-zod";

const router = Router();

router.get("/completions", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId;
    const queryUserId = req.query.userId as string | undefined;

    if (queryUserId) {
      const user = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
      if (!user[0] || user[0].role !== "admin") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const completions = await db.select().from(completionsTable)
        .where(eq(completionsTable.clerkUserId, queryUserId))
        .orderBy(desc(completionsTable.signedAt));
      res.json(completions);
      return;
    }

    const completions = await db.select().from(completionsTable)
      .where(eq(completionsTable.clerkUserId, clerkUserId))
      .orderBy(desc(completionsTable.signedAt));
    res.json(completions);
  } catch (err) {
    req.log.error({ err }, "Failed to get completions");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/completions", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId;
    const parsed = CreateCompletionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    const { documentId, signatureName } = parsed.data;

    // Look up the document's current version
    const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, documentId)).limit(1);
    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    const currentVersion = doc.version;

    // Check if already signed at this version
    const existing = await db.select().from(completionsTable)
      .where(and(
        eq(completionsTable.clerkUserId, clerkUserId),
        eq(completionsTable.documentId, documentId),
        eq(completionsTable.documentVersion, currentVersion)
      )).limit(1);

    if (existing[0]) {
      res.json(existing[0]);
      return;
    }

    const [completion] = await db.insert(completionsTable).values({
      clerkUserId,
      documentId,
      signatureName,
      documentVersion: currentVersion,
      signedAt: new Date(),
    }).returning();
    res.status(201).json(completion);
  } catch (err) {
    req.log.error({ err }, "Failed to create completion");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/completions/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [completion] = await db.delete(completionsTable).where(eq(completionsTable.id, id)).returning();
    if (!completion) {
      res.status(404).json({ error: "Completion not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete completion");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
