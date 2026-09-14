import { Injectable, InternalServerErrorException, OnModuleInit, Logger } from "@nestjs/common";
import axios from "axios";
import * as crypto from "crypto";

const NOTCHPAY_API_URL = "https://api.notchpay.co";

@Injectable()
export class PaymentsService implements OnModuleInit {
  private readonly logger = new Logger(PaymentsService.name);
  private publicKey = process.env.NOTCHPAY_PUBLIC_KEY!;
  private privateKey = process.env.NOTCHPAY_PRIVATE_KEY!;
  private webhookHash = process.env.NOTCHPAY_WEBHOOK_HASH!;

  // Warns (doesn't throw) at boot so a misconfigured deploy shows up
  // immediately in the server logs instead of only on a customer's first
  // checkout attempt. Deliberately non-fatal — cash checkout and the rest
  // of the app must keep working with these unset, per CLAUDE.md's
  // local-first-no-cloud-accounts-required setup.
  onModuleInit() {
    if (!this.publicKey) this.logger.warn("NOTCHPAY_PUBLIC_KEY is not set - online payment will fail until it's configured");
    if (!this.webhookHash) this.logger.warn("NOTCHPAY_WEBHOOK_HASH is not set - Notch Pay webhooks will be rejected as invalid until it's configured");
  }

   async initializePayment(params: {
    amount: number;
    reference: string;
    email: string;
    name: string;
    callbackUrl: string;
  }) {
    // Checked here (only when online payment is actually attempted) rather
    // than in the constructor: PaymentsModule loads at app boot regardless
    // of whether anyone hits checkout, and this repo is meant to run fully
    // local-first with no cloud accounts required (see CLAUDE.md) — cash
    // checkout and everything else must keep working without Notch Pay
    // configured at all. An unset key previously meant Notch Pay silently
    // rejected the request with Authorization: "undefined", surfacing only
    // as a generic "Could not start payment" with no clue which var was missing.
    if (!this.publicKey) {
      throw new InternalServerErrorException(
        "NOTCHPAY_PUBLIC_KEY is not set - get it from https://business.notchpay.co (Developers -> API Keys)",
      );
    }

    try {
      const response = await axios.post(
        `${NOTCHPAY_API_URL}/payments`,
        {
          amount: Math.round(params.amount), // XAF has no decimal subunits
          currency: "XAF",
          reference: params.reference,
          description: `Order ${params.reference}`,
          customer: { email: params.email, name: params.name },
          callback: params.callbackUrl,
        },
        { headers: { Authorization: this.publicKey, "Content-Type": "application/json" } },
      );

      if (!response.data?.authorization_url) {
        // Notch Pay returned 2xx but without a checkout URL to redirect to -
        // this used to fail silently (checkoutUrl: undefined sent straight
        // to the frontend), leaving the customer stuck on a spinner.
        console.error("Notch Pay response missing authorization_url:", JSON.stringify(response.data, null, 2));
        throw new InternalServerErrorException("Payment provider did not return a checkout URL");
      }

      return response.data;
    } catch (error: any) {
      if (error instanceof InternalServerErrorException) throw error;
      // Surface Notch Pay's actual validation message instead of a blind 422.
      console.error("Notch Pay error response:", JSON.stringify(error.response?.data, null, 2));
      throw error;
    }
  }

  async verifyPayment(reference: string) {
    const response = await axios.get(`${NOTCHPAY_API_URL}/payments/${reference}`, {
      headers: { Authorization: this.publicKey },
    });
    return response.data;
  }

  // Confirms a webhook genuinely came from Notch Pay, not a forged request.
  // Uses timing-safe comparison to prevent timing-attack signature guessing.
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const expected = crypto.createHmac("sha256", this.webhookHash).update(rawBody).digest("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
    } catch {
      return false; // signature was malformed / wrong length — definitely not valid
    }
  }
}