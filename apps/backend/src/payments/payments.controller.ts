import { Controller, Post, Req, Res, HttpCode } from "@nestjs/common";
import type { Request, Response } from "express";
import { PaymentsService } from "./payments.service";
import { OrdersService } from "../orders/orders.service";

@Controller("payments")
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private ordersService: OrdersService,
  ) {}

  @Post("webhooks/notchpay")
  @HttpCode(200)
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    const signature = req.headers["x-notch-signature"] as string;
    const rawBody = (req as Request & { rawBody: string }).rawBody; // set up in main.ts below

    if (!signature || !this.paymentsService.verifyWebhookSignature(rawBody, signature)) {
      return res.status(400).send("Invalid signature");
    }

    const event = req.body;

    if (event.type === "payment.complete") {
      await this.ordersService.confirmPayment(
        event.data.reference,
        event.data.transaction?.reference || event.data.reference,
      );
    } else if (event.type === "payment.failed") {
      await this.ordersService.failPayment(event.data.reference);
    }

    res.status(200).send("Webhook received");
  }
}