import { Router } from "express";
import { db } from "@workspace/db";
import { documentsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/requireAuth";
import { CreateDocumentBody, UpdateDocumentBody } from "@workspace/api-zod";

const router = Router();

router.get("/documents", requireAuth, async (req, res) => {
  try {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    if (categoryId) {
      const documents = await db.select().from(documentsTable)
        .where(eq(documentsTable.categoryId, categoryId))
        .orderBy(asc(documentsTable.sortOrder));
      res.json(documents);
      return;
    }
    const documents = await db.select().from(documentsTable).orderBy(asc(documentsTable.sortOrder));
    res.json(documents);
  } catch (err) {
    req.log.error({ err }, "Failed to get documents");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/documents/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [document] = await db.select().from(documentsTable).where(eq(documentsTable.id, id)).limit(1);
    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    res.json(document);
  } catch (err) {
    req.log.error({ err }, "Failed to get document");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/documents", requireAdmin, async (req, res) => {
  try {
    const parsed = CreateDocumentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    const { categoryId, title, description, fileUrl, fileName, content, requiresSignature, sortOrder } = parsed.data;
    const [document] = await db.insert(documentsTable).values({
      categoryId,
      title,
      description: description ?? null,
      fileUrl: fileUrl ?? null,
      fileName: fileName ?? null,
      content: content ?? null,
      requiresSignature: requiresSignature ?? true,
      sortOrder: sortOrder ?? 0,
    }).returning();
    res.status(201).json(document);
  } catch (err) {
    req.log.error({ err }, "Failed to create document");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/documents/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const parsed = UpdateDocumentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    const updates: Record<string, any> = {};
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description;
    if (parsed.data.fileUrl !== undefined) updates.fileUrl = parsed.data.fileUrl;
    if (parsed.data.fileName !== undefined) updates.fileName = parsed.data.fileName;
    if (parsed.data.content !== undefined) updates.content = parsed.data.content;
    if (parsed.data.requiresSignature !== undefined) updates.requiresSignature = parsed.data.requiresSignature;
    if (parsed.data.sortOrder !== undefined) updates.sortOrder = parsed.data.sortOrder;
    if (parsed.data.categoryId !== undefined) updates.categoryId = parsed.data.categoryId;

    if (parsed.data.bumpVersion) {
      const [current] = await db.select().from(documentsTable).where(eq(documentsTable.id, id)).limit(1);
      if (current) updates.version = current.version + 1;
    }

    const [document] = await db.update(documentsTable).set(updates).where(eq(documentsTable.id, id)).returning();
    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    res.json(document);
  } catch (err) {
    req.log.error({ err }, "Failed to update document");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/documents/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [document] = await db.delete(documentsTable).where(eq(documentsTable.id, id)).returning();
    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete document");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
