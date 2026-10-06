import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  // Mailhog (local dev) takes unauthenticated connections; real providers
  // like Resend require auth, so only attach it when credentials are set —
  // an empty `auth: {user: undefined, pass: undefined}` object would make
  // nodemailer attempt AUTH against Mailhog and fail for no reason.
  private transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: false,
    ...(process.env.MAIL_USER ? { auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASSWORD } } : {}),
  });

  async sendMail(to: string, subject: string, html: string) {
    const from = process.env.MAIL_FROM || "no-reply@truckparts.local";
    await this.transporter.sendMail({ from, to, subject, html });
  }

  // Best-effort: a slow or failing mail provider must never block or fail a
  // real state change (an order, a payment, a part request). Callers don't
  // await this.
  sendQuietly(to: string, subject: string, html: string): void {
    this.sendMail(to, subject, html).catch((err) =>
      this.logger.error(`Failed to send "${subject}" to ${to}: ${err instanceof Error ? err.message : err}`),
    );
  }

  // Alerts for the store owner (new order, new part request, a payment that
  // needs a human). ADMIN_NOTIFICATION_EMAIL is comma-separated; unset = off.
  notifyAdmin(subject: string, html: string): void {
    const recipients = (process.env.ADMIN_NOTIFICATION_EMAIL ?? "")
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);
    for (const to of recipients) this.sendQuietly(to, `[TruckParts] ${subject}`, html);
  }
}
