import { Module } from "@nestjs/common";
import { ProductRequestsController } from "./product-requests.controller";
import { ProductRequestsService } from "./product-requests.service";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [MailModule],
  controllers: [ProductRequestsController],
  providers: [ProductRequestsService],
})
export class ProductRequestsModule {}
