import { Router } from "express";
import { db } from "@workspace/db";
import { sectionsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/requireAuth";
import { CreateSectionBody, UpdateSectionBody } from "@workspace/api-zod";

const router = Router();

router.get("/sections", requireAuth, async (req, res) => {
  try {
    const sections = await db.select().from(sectionsTable).orderBy(asc(sectionsTable.sortOrder));
    res.json(sections);
  } catch (err) {
    req.log.error({ err }, "Failed to get sections");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/sections", requireAdmin, async (req, res) => {
  try {
    const parsed = CreateSectionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    const { name, description, sortOrder } = parsed.data;
    const [section] = await db.insert(sectionsTable).values({
      name,
      description: description ?? null,
      sortOrder: sortOrder ?? 0,
    }).returning();
    res.status(201).json(section);
  } catch (err) {
    req.log.error({ err }, "Failed to create section");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/sections/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const parsed = UpdateSectionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    const updates: Record<string, any> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description;
    if (parsed.data.sortOrder !== undefined) updates.sortOrder = parsed.data.sortOrder;

    const [section] = await db.update(sectionsTable).set(updates).where(eq(sectionsTable.id, id)).returning();
    if (!section) {
      res.status(404).json({ error: "Section not found" });
      return;
    }
    res.json(section);
  } catch (err) {
    req.log.error({ err }, "Failed to update section");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/sections/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [section] = await db.delete(sectionsTable).where(eq(sectionsTable.id, id)).returning();
    if (!section) {
      res.status(404).json({ error: "Section not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete section");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
