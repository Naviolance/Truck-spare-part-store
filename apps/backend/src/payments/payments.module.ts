import { Module } from "@nestjs/common";
import { PaymentGatewayService } from "./payment-gateway.service";

// Provider adapters only — no knowledge of orders. Order/payment state lives
// in orders/ (OrderPaymentsService), which depends on this module and not the
// other way round, so there's no circular import any more.
@Module({
  providers: [PaymentGatewayService],
  exports: [PaymentGatewayService],
})
export class PaymentsModule {}
