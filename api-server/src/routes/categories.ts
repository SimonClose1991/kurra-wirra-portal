import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/requireAuth";
import { CreateCategoryBody, UpdateCategoryBody } from "@workspace/api-zod";

const router = Router();

router.get("/categories", requireAuth, async (req, res) => {
  try {
    const sectionId = req.query.sectionId ? Number(req.query.sectionId) : undefined;
    let query = db.select().from(categoriesTable).orderBy(asc(categoriesTable.sortOrder));
    if (sectionId) {
      const categories = await db.select().from(categoriesTable)
        .where(eq(categoriesTable.sectionId, sectionId))
        .orderBy(asc(categoriesTable.sortOrder));
      res.json(categories);
      return;
    }
    const categories = await query;
    res.json(categories);
  } catch (err) {
    req.log.error({ err }, "Failed to get categories");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/categories", requireAdmin, async (req, res) => {
  try {
    const parsed = CreateCategoryBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    const { sectionId, name, description, sortOrder } = parsed.data;
    const [category] = await db.insert(categoriesTable).values({
      sectionId,
      name,
      description: description ?? null,
      sortOrder: sortOrder ?? 0,
    }).returning();
    res.status(201).json(category);
  } catch (err) {
    req.log.error({ err }, "Failed to create category");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/categories/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const parsed = UpdateCategoryBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    const updates: Record<string, any> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description;
    if (parsed.data.sortOrder !== undefined) updates.sortOrder = parsed.data.sortOrder;
    if (parsed.data.sectionId !== undefined) updates.sectionId = parsed.data.sectionId;

    const [category] = await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, id)).returning();
    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    res.json(category);
  } catch (err) {
    req.log.error({ err }, "Failed to update category");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/categories/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [category] = await db.delete(categoriesTable).where(eq(categoriesTable.id, id)).returning();
    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete category");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
