import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { CreateProductRequestDto } from "./dto/create-product-request.dto";
import { UpdateProductRequestDto } from "./dto/update-product-request.dto";
import { escapeHtml } from "../common/utils/escape-html";
import { phoneDigits } from "../common/validators/contact-phone";

@Injectable()
export class ProductRequestsService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  // userId is null for guests. Returns a minimal acknowledgement either way
  // (a guest must not get back other people's data, and a bot tripping the
  // honeypot must not be able to tell it was caught).
  async create(userId: string | null, dto: CreateProductRequestDto) {
    if (dto.website) return { received: true };

    const user = userId ? await this.prisma.user.findUnique({ where: { id: userId } }) : null;
    const contactName = dto.contactName || (user ? `${user.firstName} ${user.lastName}` : "");
    if (!contactName) throw new BadRequestException("Please tell us your name so we know who to ask for");

    const request = await this.prisma.productRequest.create({
      data: {
        userId: user?.id ?? null,
        description: dto.description,
        partNumber: dto.partNumber || null,
        vehicleInfo: dto.vehicleInfo || null,
        contactName,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail || user?.email || null,
        contactViaWhatsApp: dto.contactViaWhatsApp ?? true,
      },
    });

    this.notifyAdmin(request);
    return { received: true, id: request.id };
  }

  private notifyAdmin(r: {
    description: string;
    partNumber: string | null;
    vehicleInfo: string | null;
    contactName: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    contactViaWhatsApp: boolean;
  }) {
    const digits = phoneDigits(r.contactPhone ?? "");
    const whatsapp = r.contactViaWhatsApp && digits ? ` · <a href="https://wa.me/${digits}">Reply on WhatsApp</a>` : "";
    this.mail.notifyAdmin(
      `New part request from ${r.contactName}`,
      `<p><strong>${escapeHtml(r.description)}</strong></p>
       <p>Part number: ${escapeHtml(r.partNumber ?? "—")}<br>Vehicle: ${escapeHtml(r.vehicleInfo ?? "—")}</p>
       <p>${escapeHtml(r.contactName)} · <a href="tel:${escapeHtml(r.contactPhone)}">${escapeHtml(r.contactPhone)}</a>${whatsapp}
       ${r.contactEmail ? `<br>${escapeHtml(r.contactEmail)}` : ""}</p>
       <p>Prefers: ${r.contactViaWhatsApp ? "WhatsApp" : "phone call"}</p>`,
    );
  }

  findMine(userId: string) {
    return this.prisma.productRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  findAllAdmin() {
    return this.prisma.productRequest.findMany({
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateAdmin(id: string, dto: UpdateProductRequestDto) {
    const existing = await this.prisma.productRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Product request not found");

    return this.prisma.productRequest.update({
      where: { id },
      data: { status: dto.status, adminNote: dto.adminNote },
    });
  }
}
