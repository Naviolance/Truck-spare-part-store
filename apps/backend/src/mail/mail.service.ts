import { Injectable } from "@nestjs/common";
import * as nodemailer from "nodemailer";

@Injectable()
export class MailService {
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
}