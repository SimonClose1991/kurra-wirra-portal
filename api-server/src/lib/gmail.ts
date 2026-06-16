/**
 * Admin email notifications via SMTP (Nodemailer).
 *
 * Replaces the Replit-managed Gmail connector. Works with any SMTP provider:
 *   - Gmail with an App Password
 *   - Resend, Brevo, Mailgun, Postmark, Amazon SES, etc.
 *
 * Required env vars:
 *   SMTP_HOST      e.g. smtp.gmail.com  /  smtp.resend.com
 *   SMTP_PORT      e.g. 465 (SSL) or 587 (STARTTLS)
 *   SMTP_USER      SMTP username
 *   SMTP_PASS      SMTP password / app password / API key
 *   SMTP_FROM      From address, e.g. "Kurra-Wirra Portal <noreply@kurrawirra.com.au>"
 *
 * If SMTP_HOST is unset, notifications are skipped silently (e.g. local dev).
 */
import nodemailer, { type Transporter } from "nodemailer";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

let _transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (_transporter) return _transporter;
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  const port = Number(process.env.SMTP_PORT || 587);
  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
  return _transporter;
}

export async function notifyAdminsOfSubmission({
  formTitle,
  submitterName,
  submitterEmail,
  submittedAt,
}: {
  formTitle: string;
  submitterName: string;
  submitterEmail: string;
  submittedAt: Date;
}) {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      logger.warn("notifyAdmins: SMTP_HOST not set — skipping email notification");
      return;
    }

    const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@localhost";

    const admins = await db
      .select({ email: usersTable.email, firstName: usersTable.firstName })
      .from(usersTable)
      .where(eq(usersTable.role, "admin"));

    if (admins.length === 0) {
      logger.warn("notifyAdmins: no admin users found");
      return;
    }

    const dateStr = submittedAt.toLocaleDateString("en-AU", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const timeStr = submittedAt.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });

    const bodyHtml = `
<div style="font-family: sans-serif; max-width: 600px; color: #333;">
  <h2 style="color: #4a7c4e; margin-bottom: 4px;">New Form Submission</h2>
  <p style="color: #666; margin-top: 0;">A staff member has submitted a form that requires your attention.</p>
  <table style="border-collapse: collapse; width: 100%; margin-top: 16px;">
    <tr><td style="padding: 8px 12px; background: #f5f5f5; font-weight: 600; width: 140px; border-radius: 4px 0 0 4px;">Form</td><td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${formTitle}</td></tr>
    <tr><td style="padding: 8px 12px; background: #f5f5f5; font-weight: 600; border-radius: 4px 0 0 4px;">Submitted by</td><td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${submitterName}${submitterEmail ? ` &lt;${submitterEmail}&gt;` : ""}</td></tr>
    <tr><td style="padding: 8px 12px; background: #f5f5f5; font-weight: 600; border-radius: 4px 0 0 4px;">Date &amp; time</td><td style="padding: 8px 12px;">${dateStr} at ${timeStr}</td></tr>
  </table>
  <p style="margin-top: 24px; color: #888; font-size: 13px;">Log in to the Kurra-Wirra Staff Portal to view the full submission.</p>
</div>`;

    const recipients = admins.map((a) => a.email).filter((e): e is string => !!e);
    if (recipients.length === 0) {
      logger.warn("notifyAdmins: no admin email addresses");
      return;
    }

    await transporter.sendMail({
      from,
      to: recipients,
      subject: `[Staff Portal] New submission: ${formTitle}`,
      html: bodyHtml,
    });

    logger.info({ count: recipients.length, form: formTitle }, "Admin notification email sent");
  } catch (err) {
    logger.error({ err }, "notifyAdminsOfSubmission error");
  }
}
