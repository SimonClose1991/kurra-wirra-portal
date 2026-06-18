import { Router } from "express";
import { db } from "@workspace/db";
import { formsTable, formFieldsTable, formSubmissionsTable, usersTable } from "@workspace/db";
import { eq, asc, desc, and, inArray } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/requireAuth";
import { CreateFormBody, UpdateFormBody, CreateFormFieldBody, UpdateFormFieldBody, SubmitFormBody } from "@workspace/api-zod";
import { notifyAdminsOfSubmission } from "../lib/gmail";

const router = Router();

router.get("/forms", requireAuth, async (req, res) => {
  try {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    let forms;
    if (categoryId) {
      forms = await db.select().from(formsTable)
        .where(eq(formsTable.categoryId, categoryId))
        .orderBy(asc(formsTable.sortOrder));
    } else {
      forms = await db.select().from(formsTable).orderBy(asc(formsTable.sortOrder));
    }
    res.json(forms);
  } catch (err) {
    req.log.error({ err }, "Failed to get forms");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/forms/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [form] = await db.select().from(formsTable).where(eq(formsTable.id, id)).limit(1);
    if (!form) {
      res.status(404).json({ error: "Form not found" });
      return;
    }
    const fields = await db.select().from(formFieldsTable)
      .where(eq(formFieldsTable.formId, id))
      .orderBy(asc(formFieldsTable.sortOrder));
    res.json({ ...form, fields });
  } catch (err) {
    req.log.error({ err }, "Failed to get form");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/forms", requireAdmin, async (req, res) => {
  try {
    const parsed = CreateFormBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    const [form] = await db.insert(formsTable).values({
      categoryId: parsed.data.categoryId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      sortOrder: parsed.data.sortOrder ?? 0,
      isRepeatable: parsed.data.isRepeatable ?? false,
      notifyAdmins: parsed.data.notifyAdmins ?? false,
    }).returning();
    res.status(201).json(form);
  } catch (err) {
    req.log.error({ err }, "Failed to create form");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/forms/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const parsed = UpdateFormBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    const [form] = await db.update(formsTable).set({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      sortOrder: parsed.data.sortOrder ?? 0,
      isRepeatable: parsed.data.isRepeatable ?? false,
      notifyAdmins: parsed.data.notifyAdmins ?? false,
    }).where(eq(formsTable.id, id)).returning();
    if (!form) {
      res.status(404).json({ error: "Form not found" });
      return;
    }
    res.json(form);
  } catch (err) {
    req.log.error({ err }, "Failed to update form");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/forms/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(formsTable).where(eq(formsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete form");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/forms/:id/fields", requireAdmin, async (req, res) => {
  try {
    const formId = Number(req.params.id);
    const parsed = CreateFormFieldBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    const [field] = await db.insert(formFieldsTable).values({
      formId,
      label: parsed.data.label,
      fieldType: parsed.data.fieldType,
      required: parsed.data.required,
      placeholder: parsed.data.placeholder ?? null,
      options: parsed.data.options ?? null,
      sortOrder: parsed.data.sortOrder,
    }).returning();
    res.status(201).json(field);
  } catch (err) {
    req.log.error({ err }, "Failed to create form field");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/forms/:id/fields/:fieldId", requireAdmin, async (req, res) => {
  try {
    const fieldId = Number(req.params.fieldId);
    const parsed = UpdateFormFieldBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    const [field] = await db.update(formFieldsTable).set({
      label: parsed.data.label,
      fieldType: parsed.data.fieldType,
      required: parsed.data.required,
      placeholder: parsed.data.placeholder ?? null,
      options: parsed.data.options ?? null,
      sortOrder: parsed.data.sortOrder,
    }).where(eq(formFieldsTable.id, fieldId)).returning();
    if (!field) {
      res.status(404).json({ error: "Field not found" });
      return;
    }
    res.json(field);
  } catch (err) {
    req.log.error({ err }, "Failed to update form field");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/forms/:id/fields/:fieldId", requireAdmin, async (req, res) => {
  try {
    const fieldId = Number(req.params.fieldId);
    await db.delete(formFieldsTable).where(eq(formFieldsTable.id, fieldId));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete form field");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/forms/:id/submit", requireAuth, async (req, res) => {
  try {
    const formId = Number(req.params.id);
    const clerkUserId = (req as any).clerkUserId as string;
    const parsed = SubmitFormBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    const [formRecord] = await db.select().from(formsTable).where(eq(formsTable.id, formId)).limit(1);
    if (!formRecord) {
      res.status(404).json({ error: "Form not found" });
      return;
    }
    if (!formRecord.isRepeatable) {
      const [existing] = await db.select().from(formSubmissionsTable)
        .where(and(eq(formSubmissionsTable.formId, formId), eq(formSubmissionsTable.clerkUserId, clerkUserId)))
        .limit(1);
      if (existing) {
        res.status(409).json({ error: "Already submitted" });
        return;
      }
    }
    // Gather submitter info before sending response (so it's inside the try/catch)
    const [submitter] = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);

    const [submission] = await db.insert(formSubmissionsTable).values({
      formId,
      clerkUserId,
      data: JSON.stringify(parsed.data.data),
    }).returning();

    res.status(201).json({ ...submission, data: JSON.parse(submission.data) });

    // Fire-and-forget email notifications — run after response so it never delays the user
    if (formRecord.notifyAdmins) {
      const submitterName = submitter
        ? [submitter.firstName, submitter.lastName].filter(Boolean).join(" ") || submitter.email
        : clerkUserId;
      const payload = {
        formTitle: formRecord.title,
        submitterName: submitterName ?? "Unknown",
        submitterEmail: submitter?.email ?? "",
        submittedAt: submission.submittedAt,
      };
      setImmediate(() => {
        console.log("[EMAIL] Sending admin notification for form:", payload.formTitle);
        notifyAdminsOfSubmission(payload).catch(err => {
          console.error("[EMAIL] notifyAdminsOfSubmission failed:", err);
        });
      });
    }
  } catch (err) {
    req.log.error({ err }, "Failed to submit form");
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

router.get("/forms/:id/my-submission", requireAuth, async (req, res) => {
  try {
    const formId = Number(req.params.id);
    const clerkUserId = (req as any).clerkUserId as string;
    const [submission] = await db.select().from(formSubmissionsTable)
      .where(and(eq(formSubmissionsTable.formId, formId), eq(formSubmissionsTable.clerkUserId, clerkUserId)))
      .limit(1);
    if (!submission) {
      res.status(404).json({ error: "Not submitted yet" });
      return;
    }
    res.json({ ...submission, data: JSON.parse(submission.data) });
  } catch (err) {
    req.log.error({ err }, "Failed to get submission");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/forms/:id/submissions", requireAdmin, async (req, res) => {
  try {
    const formId = Number(req.params.id);
    const submissions = await db.select().from(formSubmissionsTable)
      .where(eq(formSubmissionsTable.formId, formId))
      .orderBy(asc(formSubmissionsTable.submittedAt));

    const clerkUserIds = [...new Set(submissions.map(s => s.clerkUserId))];
    const users = clerkUserIds.length > 0
      ? await db.select().from(usersTable).where(inArray(usersTable.clerkUserId, clerkUserIds))
      : [];

    const userMap = new Map(users.map(u => [u.clerkUserId, u]));

    const result = submissions.map(s => ({
      ...s,
      data: JSON.parse(s.data),
      user: userMap.get(s.clerkUserId) ?? null,
    }));
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get submissions");
    res.status(500).json({ error: "Internal server error" });
  }
});
// --- Admin notifications: form submissions flagged notifyAdmins ---
router.get("/admin/notifications", requireAdmin, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId as string;

    const meRows = await db.select().from(usersTable)
      .where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    const seenAt = meRows[0]?.notificationsSeenAt ?? null;

    const notifyForms = await db.select().from(formsTable)
      .where(eq(formsTable.notifyAdmins, true));
    const notifyFormIds = notifyForms.map(f => f.id);
    const formTitleMap = new Map(notifyForms.map(f => [f.id, f.title]));

    if (notifyFormIds.length === 0) {
      res.json({ unseenCount: 0, submissions: [] });
      return;
    }

    const submissions = await db.select().from(formSubmissionsTable)
      .where(inArray(formSubmissionsTable.formId, notifyFormIds))
      .orderBy(desc(formSubmissionsTable.submittedAt));

    const clerkUserIds = [...new Set(submissions.map(s => s.clerkUserId))];
    const users = clerkUserIds.length > 0
      ? await db.select().from(usersTable).where(inArray(usersTable.clerkUserId, clerkUserIds))
      : [];
    const userMap = new Map(users.map(u => [u.clerkUserId, u]));

    const result = submissions.map(s => ({
      id: s.id,
      formId: s.formId,
      formTitle: formTitleMap.get(s.formId) ?? "Form",
      submittedAt: s.submittedAt,
      data: JSON.parse(s.data),
      user: userMap.get(s.clerkUserId) ?? null,
    }));

    const unseenCount = seenAt
      ? result.filter(s => new Date(s.submittedAt) > new Date(seenAt)).length
      : result.length;

    res.json({ unseenCount, submissions: result });
  } catch (err) {
    req.log.error({ err }, "Failed to get admin notifications");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/notifications/seen", requireAdmin, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId as string;
    await db.update(usersTable)
      .set({ notificationsSeenAt: new Date() })
      .where(eq(usersTable.clerkUserId, clerkUserId));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to mark notifications seen");
    res.status(500).json({ error: "Internal server error" });
  }
});
export default router;
