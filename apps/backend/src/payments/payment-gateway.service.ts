import { Injectable, Logger } from "@nestjs/common";
import type { PaymentProvider } from "./providers/payment-provider";
import { NotchPayProvider } from "./providers/notchpay.provider";

// Picks the active online payment provider from PAYMENT_PROVIDER. Unset means
// "no online payments" — the store runs on cash at pickup only, and the
// checkout UI hides the online option (GET /orders/payment-options).
//
// To add a provider: write an adapter implementing PaymentProvider in
// ./providers, add a case below, and set PAYMENT_PROVIDER to its name.
@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);
  private readonly provider: PaymentProvider | null;

  constructor() {
    this.provider = this.build(process.env.PAYMENT_PROVIDER?.trim().toLowerCase());
    this.logger.log(this.provider ? `Online payments via ${this.provider.name}` : "Online payments disabled (cash only)");
  }

  // Exposed for tests and for wiring a provider without env vars.
  static withProvider(provider: PaymentProvider | null): PaymentGatewayService {
    const gateway = Object.create(PaymentGatewayService.prototype) as PaymentGatewayService;
    Object.assign(gateway, { provider, logger: new Logger(PaymentGatewayService.name) });
    return gateway;
  }

  active(): PaymentProvider | null {
    return this.provider;
  }

  // Webhooks arrive at /payments/webhooks/:provider — only the active one is accepted.
  byName(name: string): PaymentProvider | null {
    return this.provider?.name === name ? this.provider : null;
  }

  private build(name: string | undefined): PaymentProvider | null {
    switch (name) {
      case undefined:
      case "":
      case "none":
        return null;
      case "notchpay":
        return new NotchPayProvider(requireEnv("NOTCHPAY_PUBLIC_KEY"), requireEnv("NOTCHPAY_WEBHOOK_HASH"));
      default:
        throw new Error(`Unknown PAYMENT_PROVIDER "${name}"`);
    }
  }
}

// Fail at startup, not at the first customer's checkout.
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required when PAYMENT_PROVIDER is set`);
  return value;
}
