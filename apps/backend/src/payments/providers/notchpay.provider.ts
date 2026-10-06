import axios from "axios";
import * as crypto from "crypto";
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentProvider,
  PaymentStatusResult,
  PaymentWebhookEvent,
  ProviderPaymentStatus,
} from "./payment-provider";

const NOTCHPAY_API_URL = "https://api.notchpay.co";
// Bounds how long a slow Notch Pay response can block a checkout or an order
// page poll that reconciles a pending payment.
const NOTCHPAY_TIMEOUT_MS = 5000;

const FAILED_STATUSES = ["failed", "expired", "canceled", "cancelled", "declined"];

function toStatus(raw: unknown): ProviderPaymentStatus {
  if (raw === "complete" || raw === "completed" || raw === "succeeded") return "succeeded";
  if (typeof raw === "string" && FAILED_STATUSES.includes(raw)) return "failed";
  return "pending";
}

// Reference adapter — kept as the worked example for the next provider, and
// only active when PAYMENT_PROVIDER=notchpay. Its webhook field mapping has
// NOT been checked against a real Notch Pay delivery yet: it accepts the
// reference from either data.merchant_reference or data.reference so the core
// can match on whichever one Notch Pay actually sends. Verify with one real
// sandbox webhook before enabling.
export class NotchPayProvider implements PaymentProvider {
  readonly name = "notchpay";

  constructor(
    private publicKey: string,
    private webhookHash: string,
  ) {}

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    try {
      const { data } = await axios.post(
        `${NOTCHPAY_API_URL}/payments`,
        {
          amount: input.amount,
          currency: input.currency,
          reference: input.reference,
          description: input.description,
          customer: input.customer,
          callback: input.returnUrl,
        },
        { headers: { Authorization: this.publicKey, "Content-Type": "application/json" }, timeout: NOTCHPAY_TIMEOUT_MS },
      );
      return { checkoutUrl: data.authorization_url, providerReference: data.transaction?.reference ?? input.reference };
    } catch (error) {
      // Surface Notch Pay's actual validation message in the logs.
      const details = axios.isAxiosError(error) ? error.response?.data : error;
      console.error("Notch Pay error response:", JSON.stringify(details));
      throw error;
    }
  }

  async fetchStatus(providerReference: string): Promise<PaymentStatusResult> {
    const { data } = await axios.get(`${NOTCHPAY_API_URL}/payments/${encodeURIComponent(providerReference)}`, {
      headers: { Authorization: this.publicKey },
      timeout: NOTCHPAY_TIMEOUT_MS,
    });
    return { status: toStatus(data.transaction?.status), amount: Number(data.transaction?.amount) || undefined };
  }

  // HMAC-SHA256 over the RAW body (main.ts keeps req.rawBody for this),
  // compared in constant time.
  parseWebhook(rawBody: string, headers: Record<string, string | string[] | undefined>): PaymentWebhookEvent | null {
    const signature = headers["x-notch-signature"];
    if (typeof signature !== "string" || !rawBody) return null;

    const expected = crypto.createHmac("sha256", this.webhookHash).update(rawBody).digest("hex");
    let valid: boolean;
    try {
      valid = crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
    } catch {
      valid = false; // malformed / wrong-length signature
    }
    if (!valid) return null;

    const event = JSON.parse(rawBody);
    const data = event.data ?? {};
    const status: ProviderPaymentStatus =
      event.type === "payment.complete" ? "succeeded" : event.type === "payment.failed" ? "failed" : toStatus(data.status);

    return {
      status,
      reference: data.merchant_reference ?? data.reference,
      providerReference: data.transaction?.reference ?? data.reference,
      amount: Number(data.amount) || undefined,
    };
  }
}
