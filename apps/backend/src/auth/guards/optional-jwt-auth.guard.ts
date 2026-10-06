import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

// For routes open to guests that still want to know WHO is calling when
// someone is logged in (e.g. a part request gets linked to the account).
// A missing, expired or invalid token means "guest" — never a 401.
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  handleRequest<TUser>(_err: unknown, user: TUser | false): TUser | null {
    return user || null;
  }
}
