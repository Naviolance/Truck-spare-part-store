import { Controller, HttpCode, Param, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { OrderPaymentsService } from "./order-payments.service";

// Public (providers call it, no JWT). Authenticity comes from the provider's
// signature over the RAW body — main.ts keeps req.rawBody for exactly this.
@Controller("payments/webhooks")
export class PaymentWebhooksController {
  constructor(private orderPayments: OrderPaymentsService) {}

  @Post(":provider")
  @HttpCode(200)
  async handle(@Param("provider") provider: string, @Req() req: Request, @Res() res: Response) {
    const rawBody = (req as Request & { rawBody?: string }).rawBody ?? "";
    const ok = await this.orderPayments.handleWebhook(provider, rawBody, req.headers);
    if (!ok) return res.status(400).send("Invalid signature");
    res.status(200).send("Webhook received");
  }
}
