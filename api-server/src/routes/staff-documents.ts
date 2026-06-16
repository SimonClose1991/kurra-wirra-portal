import { Router } from "express";
import { db } from "@workspace/db";
import { staffDocumentsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/requireAuth";
import { z } from "zod/v4";

const router = Router();

const CreateStaffDocumentBody = z.object({
  title: z.string().min(1),
  objectPath: z.string().min(1),
  fileUrl: z.string().min(1),
  clerkUserId: z.string().optional(),
});

router.get("/staff-documents", requireAuth, async (req, res) => {
  try {
    const requestingUserId = (req as any).clerkUserId;
    const queryUserId = req.query.clerkUserId as string | undefined;

    if (queryUserId && queryUserId !== requestingUserId) {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, requestingUserId)).limit(1);
      if (!user || user.role !== "admin") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const docs = await db.select().from(staffDocumentsTable).where(eq(staffDocumentsTable.clerkUserId, queryUserId));
      res.json(docs);
      return;
    }

    const docs = await db.select().from(staffDocumentsTable).where(eq(staffDocumentsTable.clerkUserId, requestingUserId));
    res.json(docs);
  } catch (err) {
    req.log.error({ err }, "Failed to get staff documents");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/staff-documents", requireAuth, async (req, res) => {
  try {
    const requestingUserId = (req as any).clerkUserId;
    const parsed = CreateStaffDocumentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    let targetUserId = requestingUserId;
    if (parsed.data.clerkUserId && parsed.data.clerkUserId !== requestingUserId) {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, requestingUserId)).limit(1);
      if (!user || user.role !== "admin") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      targetUserId = parsed.data.clerkUserId;
    }

    const [doc] = await db.insert(staffDocumentsTable).values({
      clerkUserId: targetUserId,
      title: parsed.data.title,
      objectPath: parsed.data.objectPath,
      fileUrl: parsed.data.fileUrl,
    }).returning();

    res.status(201).json(doc);
  } catch (err) {
    req.log.error({ err }, "Failed to create staff document");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/staff-documents/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [doc] = await db.delete(staffDocumentsTable).where(eq(staffDocumentsTable.id, id)).returning();
    if (!doc) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete staff document");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
