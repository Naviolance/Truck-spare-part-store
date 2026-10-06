import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { PaymentWebhooksController } from "./payment-webhooks.controller";
import { OrdersService } from "./orders.service";
import { OrderPaymentsService } from "./order-payments.service";
import { OrderExpiryService } from "./order-expiry.service";
import { PaymentsModule } from "../payments/payments.module";
import { CouponsModule } from "../coupons/coupons.module";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [PaymentsModule, CouponsModule, MailModule],
  controllers: [OrdersController, PaymentWebhooksController],
  providers: [OrdersService, OrderPaymentsService, OrderExpiryService],
  exports: [OrdersService],
})
export class OrdersModule {}
