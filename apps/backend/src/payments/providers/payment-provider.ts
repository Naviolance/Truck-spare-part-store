// The contract every online payment provider adapter implements. The rest of
// the app (orders, stock, retries, expiry) only ever talks to this interface,
// so switching providers means writing one new adapter file and registering
// it in PaymentGatewayService — nothing in orders/ changes.
//
// Every hosted-checkout provider (Notch Pay, CinetPay, Flutterwave, Campay,
// Stripe...) fits this shape: create a checkout and redirect the customer,
// look a payment up by its reference, and send signed webhooks.

export type ProviderPaymentStatus = "pending" | "succeeded" | "failed";

export interface CreateCheckoutInput {
  amount: number; // whole XAF, already rounded
  currency: "XAF";
  reference: string; // our unique per-attempt reference (Payment.reference)
  description: string;
  customer: { email: string; name: string; phone?: string };
  returnUrl: string; // where the provider sends the customer afterwards
}

export interface CreateCheckoutResult {
  checkoutUrl: string;
  providerReference: string; // the provider's own id for this payment
}

export interface PaymentStatusResult {
  status: ProviderPaymentStatus;
  amount?: number; // as reported by the provider, checked against what we expect
}

// A verified webhook, normalised. Providers disagree on whether the payload
// carries THEIR id, OUR reference, or both — adapters fill in whatever they
// get and the core looks the payment up by either.
export interface PaymentWebhookEvent extends PaymentStatusResult {
  reference?: string;
  providerReference?: string;
}

export interface PaymentProvider {
  readonly name: string;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  fetchStatus(providerReference: string): Promise<PaymentStatusResult>;
  // Returns null when the signature doesn't verify — the caller must treat
  // the request as forged and change nothing.
  parseWebhook(rawBody: string, headers: Record<string, string | string[] | undefined>): PaymentWebhookEvent | null;
}
