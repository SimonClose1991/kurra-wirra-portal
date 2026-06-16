import { Router } from "express";
import { db } from "@workspace/db";
import { categoryNotesTable, documentNotesTable, usersTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/requireAuth";
import { getAuth } from "@clerk/express";

const router = Router();

router.get("/categories/:id/notes", requireAuth, async (req, res) => {
  try {
    const categoryId = Number(req.params.id);
    const clerkUserId = (req as any).clerkUserId;

    const auth = getAuth(req as any);
    const userRecord = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    const isAdmin = userRecord[0]?.role === "admin";

    let notes;
    if (isAdmin) {
      notes = await db.select().from(categoryNotesTable).where(eq(categoryNotesTable.categoryId, categoryId));
    } else {
      const allNotes = await db.select().from(categoryNotesTable).where(eq(categoryNotesTable.categoryId, categoryId));
      notes = allNotes.filter(n =>
        (n.clerkUserId === clerkUserId && !n.isAdminNote) ||
        (n.isAdminNote && n.isVisibleToStaff)
      );
    }

    const userIds = [...new Set(notes.map(n => n.clerkUserId))];
    const users = userIds.length > 0
      ? await db.select().from(usersTable).then(rows => rows.filter(u => userIds.includes(u.clerkUserId)))
      : [];

    const result = notes.map(n => {
      const author = users.find(u => u.clerkUserId === n.clerkUserId);
      return {
        id: n.id,
        categoryId: n.categoryId,
        clerkUserId: n.clerkUserId,
        content: n.content,
        isAdminNote: n.isAdminNote,
        isVisibleToStaff: n.isVisibleToStaff,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
        authorName: author ? [author.firstName, author.lastName].filter(Boolean).join(" ") || author.email : null,
      };
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get category notes");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/categories/:id/notes", requireAuth, async (req, res) => {
  try {
    const categoryId = Number(req.params.id);
    const clerkUserId = (req as any).clerkUserId;
    const { content, isAdminNote, isVisibleToStaff } = req.body;

    if (!content || typeof content !== "string") {
      res.status(400).json({ error: "content is required" });
      return;
    }

    const userRecord = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    const isAdmin = userRecord[0]?.role === "admin";
    const noteIsAdmin = isAdmin && isAdminNote === true;

    if (isAdminNote && !isAdmin) {
      res.status(403).json({ error: "Only admins can write admin notes" });
      return;
    }

    const existing = await db.select().from(categoryNotesTable).where(
      and(
        eq(categoryNotesTable.categoryId, categoryId),
        eq(categoryNotesTable.clerkUserId, clerkUserId),
        eq(categoryNotesTable.isAdminNote, noteIsAdmin),
      )
    ).limit(1);

    let note;
    if (existing[0]) {
      const updates: any = { content };
      if (isAdmin && typeof isVisibleToStaff === "boolean") updates.isVisibleToStaff = isVisibleToStaff;
      [note] = await db.update(categoryNotesTable).set(updates).where(eq(categoryNotesTable.id, existing[0].id)).returning();
    } else {
      [note] = await db.insert(categoryNotesTable).values({
        categoryId,
        clerkUserId,
        content,
        isAdminNote: noteIsAdmin,
        isVisibleToStaff: isAdmin && typeof isVisibleToStaff === "boolean" ? isVisibleToStaff : true,
      }).returning();
    }

    const author = userRecord[0];
    res.json({
      id: note.id,
      categoryId: note.categoryId,
      clerkUserId: note.clerkUserId,
      content: note.content,
      isAdminNote: note.isAdminNote,
      isVisibleToStaff: note.isVisibleToStaff,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      authorName: author ? [author.firstName, author.lastName].filter(Boolean).join(" ") || author.email : null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to upsert category note");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/categories/:id/notes/:noteId", requireAuth, async (req, res) => {
  try {
    const noteId = Number(req.params.noteId);
    const clerkUserId = (req as any).clerkUserId;
    const { content, isVisibleToStaff } = req.body;

    const existing = await db.select().from(categoryNotesTable).where(eq(categoryNotesTable.id, noteId)).limit(1);
    if (!existing[0]) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    const userRecord = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    const isAdmin = userRecord[0]?.role === "admin";

    if (!isAdmin && existing[0].clerkUserId !== clerkUserId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const updates: any = {};
    if (typeof content === "string") updates.content = content;
    if (isAdmin && typeof isVisibleToStaff === "boolean") updates.isVisibleToStaff = isVisibleToStaff;

    const [note] = await db.update(categoryNotesTable).set(updates).where(eq(categoryNotesTable.id, noteId)).returning();

    const author = userRecord[0];
    res.json({
      id: note.id,
      categoryId: note.categoryId,
      clerkUserId: note.clerkUserId,
      content: note.content,
      isAdminNote: note.isAdminNote,
      isVisibleToStaff: note.isVisibleToStaff,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      authorName: author ? [author.firstName, author.lastName].filter(Boolean).join(" ") || author.email : null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update category note");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/categories/:id/notes/:noteId", requireAuth, async (req, res) => {
  try {
    const noteId = Number(req.params.noteId);
    const clerkUserId = (req as any).clerkUserId;

    const existing = await db.select().from(categoryNotesTable).where(eq(categoryNotesTable.id, noteId)).limit(1);
    if (!existing[0]) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    const userRecord = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    const isAdmin = userRecord[0]?.role === "admin";

    if (!isAdmin && existing[0].clerkUserId !== clerkUserId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await db.delete(categoryNotesTable).where(eq(categoryNotesTable.id, noteId));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete category note");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Document admin comments ──────────────────────────────────────────────────

router.get("/documents/:id/notes", requireAdmin, async (req, res) => {
  try {
    const documentId = Number(req.params.id);
    const notes = await db
      .select()
      .from(documentNotesTable)
      .where(eq(documentNotesTable.documentId, documentId))
      .orderBy(asc(documentNotesTable.createdAt));

    const userIds = [...new Set(notes.map(n => n.clerkUserId))];
    const users = userIds.length > 0
      ? await db.select().from(usersTable).then(rows => rows.filter(u => userIds.includes(u.clerkUserId)))
      : [];

    const result = notes.map(n => {
      const author = users.find(u => u.clerkUserId === n.clerkUserId);
      return {
        id: n.id,
        documentId: n.documentId,
        clerkUserId: n.clerkUserId,
        content: n.content,
        createdAt: n.createdAt.toISOString(),
        authorName: author
          ? [author.firstName, author.lastName].filter(Boolean).join(" ") || author.email
          : null,
      };
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get document notes");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/documents/:id/notes", requireAdmin, async (req, res) => {
  try {
    const documentId = Number(req.params.id);
    const clerkUserId = (req as any).clerkUserId as string;
    const { content } = req.body;

    if (!content || typeof content !== "string" || !content.trim()) {
      res.status(400).json({ error: "content is required" });
      return;
    }

    const [note] = await db
      .insert(documentNotesTable)
      .values({ documentId, clerkUserId, content: content.trim() })
      .returning();

    const [author] = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);

    res.status(201).json({
      id: note.id,
      documentId: note.documentId,
      clerkUserId: note.clerkUserId,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      authorName: author
        ? [author.firstName, author.lastName].filter(Boolean).join(" ") || author.email
        : null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create document note");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/documents/:id/notes/:noteId", requireAdmin, async (req, res) => {
  try {
    const noteId = Number(req.params.noteId);
    const clerkUserId = (req as any).clerkUserId as string;

    const [existing] = await db
      .select()
      .from(documentNotesTable)
      .where(eq(documentNotesTable.id, noteId))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    if (existing.clerkUserId !== clerkUserId) {
      res.status(403).json({ error: "You can only delete your own comments" });
      return;
    }

    await db.delete(documentNotesTable).where(eq(documentNotesTable.id, noteId));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete document note");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
