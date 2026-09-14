import { Injectable } from "@nestjs/common";
import axios from "axios";
import * as crypto from "crypto";

const NOTCHPAY_API_URL = "https://api.notchpay.co";
// GET /orders/:id calls verifyPayment() synchronously on every poll while an
// order is pending — without a timeout, a slow Notch Pay response blocks
// that request (and the order page's initial load) for however long it
// takes, which is what made the page look stuck until a manual refresh.
const NOTCHPAY_TIMEOUT_MS = 5000;

@Injectable()
export class PaymentsService {
  private publicKey = process.env.NOTCHPAY_PUBLIC_KEY!;
  private privateKey = process.env.NOTCHPAY_PRIVATE_KEY!;
  private webhookHash = process.env.NOTCHPAY_WEBHOOK_HASH!;

   async initializePayment(params: {
    amount: number;
    reference: string;
    email: string;
    name: string;
    callbackUrl: string;
  }) {
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
        { headers: { Authorization: this.publicKey, "Content-Type": "application/json" }, timeout: NOTCHPAY_TIMEOUT_MS },
      );

      return response.data;
    } catch (error: any) {
      // Surface Notch Pay's actual validation message instead of a blind 422.
      console.error("Notch Pay error response:", JSON.stringify(error.response?.data, null, 2));
      throw error;
    }
  }

  async verifyPayment(reference: string) {
    const response = await axios.get(`${NOTCHPAY_API_URL}/payments/${reference}`, {
      headers: { Authorization: this.publicKey },
      timeout: NOTCHPAY_TIMEOUT_MS,
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