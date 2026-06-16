import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).clerkUserId = userId;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, userId)).limit(1);
  if (!user[0] || user[0].role !== "admin") {
    res.status(403).json({ error: "Forbidden: admin only" });
    return;
  }
  (req as any).clerkUserId = userId;
  next();
}

export async function ensureUserExists(clerkUserId: string, email: string, firstName?: string | null, lastName?: string | null) {
  const bootstrapAdminId = process.env.BOOTSTRAP_ADMIN_CLERK_ID;
  const isBootstrapAdmin = bootstrapAdminId && clerkUserId === bootstrapAdminId;

  const existing = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
  if (!existing[0]) {
    const isFirst = (await db.select().from(usersTable).limit(1)).length === 0;
    const role = (isFirst || isBootstrapAdmin) ? "admin" : "staff";
    await db.insert(usersTable).values({
      clerkUserId,
      email,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      role,
    });
    return role;
  }

  const u = existing[0];
  const profileUpdates: Record<string, string> = {};
  if (email && email !== u.email) profileUpdates.email = email;
  if (firstName && firstName !== u.firstName) profileUpdates.firstName = firstName;
  if (lastName && lastName !== u.lastName) profileUpdates.lastName = lastName;
  if (Object.keys(profileUpdates).length > 0) {
    await db.update(usersTable).set(profileUpdates).where(eq(usersTable.clerkUserId, clerkUserId));
  }

  if (isBootstrapAdmin && u.role !== "admin") {
    await db.update(usersTable).set({ role: "admin" }).where(eq(usersTable.clerkUserId, clerkUserId));
    return "admin";
  }

  return u.role;
}
