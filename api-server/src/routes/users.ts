import { Router } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable, completionsTable, documentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin, ensureUserExists } from "../middlewares/requireAuth";
import { UpdateUserRoleBody, UpdateMeBody } from "@workspace/api-zod";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId;

    // Fetch user directly from Clerk backend to guarantee we get the email
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? "";
    const firstName = clerkUser.firstName ?? null;
    const lastName = clerkUser.lastName ?? null;

    const role = await ensureUserExists(clerkUserId, email, firstName, lastName);

    const user = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    const u = user[0];

    res.json({
      clerkUserId: u.clerkUserId,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get current user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/users", requireAdmin, async (req, res) => {
  try {
    const users = await db.select().from(usersTable);
    const allDocuments = await db.select().from(documentsTable);
    const signableDocuments = allDocuments.filter(d => d.requiresSignature);
    const totalDocuments = signableDocuments.length;
    const allCompletions = await db.select().from(completionsTable);

    const result = users.map((user) => {
      const userCompletions = allCompletions.filter(c => c.clerkUserId === user.clerkUserId);
      return {
        clerkUserId: user.clerkUserId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        completedCount: signableDocuments.filter(doc =>
          userCompletions.some(c => c.documentId === doc.id && c.documentVersion === doc.version)
        ).length,
        totalDocuments,
        completions: userCompletions.map(c => ({
          id: c.id,
          clerkUserId: c.clerkUserId,
          documentId: c.documentId,
          signatureName: c.signatureName,
          documentVersion: c.documentVersion,
          signedAt: c.signedAt.toISOString(),
          createdAt: c.createdAt.toISOString(),
        })),
      };
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get admin users");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/me", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId as string;
    const parsed = UpdateMeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    await db.update(usersTable).set({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
    }).where(eq(usersTable.clerkUserId, clerkUserId));
    const [updated] = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    res.json({
      clerkUserId: updated.clerkUserId,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      role: updated.role,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admin/users/:clerkUserId/role", requireAdmin, async (req, res) => {
  try {
    const targetUserId = req.params.clerkUserId as string;
    const parsed = UpdateUserRoleBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    await db.update(usersTable).set({ role: parsed.data.role }).where(eq(usersTable.clerkUserId, targetUserId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to update user role");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
