import { Module, forwardRef } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { PaymentsModule } from "../payments/payments.module";
import { CouponsModule } from "../coupons/coupons.module";

@Module({
  imports: [forwardRef(() => PaymentsModule), CouponsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
