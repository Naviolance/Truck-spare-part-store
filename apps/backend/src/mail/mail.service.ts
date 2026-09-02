import { Injectable } from "@nestjs/common";
import * as nodemailer from "nodemailer";

@Injectable()
export class MailService {
  private transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: false,
  });

  async sendMail(to: string, subject: string, html: string) {
    await this.transporter.sendMail({ from: "no-reply@truckparts.local", to, subject, html });
  }
}