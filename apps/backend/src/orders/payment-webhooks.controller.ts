import { Controller, Get, HttpCode, Param, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { OrderPaymentsService } from "./order-payments.service";

// Public routes (no JWT).
@Controller("payments")
export class PaymentWebhooksController {
  constructor(private orderPayments: OrderPaymentsService) {}

  // Which payment methods are on (online only when a provider is
  // configured) — product pages and checkout show the right options.
  @Get("options")
  options() {
    return this.orderPayments.options();
  }

  // Called by the payment provider. Authenticity comes from its signature
  // over the RAW body — main.ts keeps req.rawBody for exactly this.
  @Post("webhooks/:provider")
  @HttpCode(200)
  async handle(@Param("provider") provider: string, @Req() req: Request, @Res() res: Response) {
    const rawBody = (req as Request & { rawBody?: string }).rawBody ?? "";
    const ok = await this.orderPayments.handleWebhook(provider, rawBody, req.headers);
    if (!ok) return res.status(400).send("Invalid signature");
    res.status(200).send("Webhook received");
  }
}
