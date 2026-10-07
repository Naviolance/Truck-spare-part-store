// Stable codes for every error a user can see. The API sends
// { statusCode, code, message, params? }; the frontend shows the translation
// of `code` (messages/{en,fr}.json, "ApiErrors") filled with `params`, so a
// French customer never sees the English `message`. `message` stays for
// logs, API clients and as the English fallback.
//
// Adding a code: add it here and to ApiErrors in BOTH frontend message files
// (common/errors.spec.ts fails otherwise).
export const ERROR_CODES = [
  // Generic — set by AllExceptionsFilter when a handler didn't pick one.
  "VALIDATION_FAILED",
  "RATE_LIMITED",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "BAD_REQUEST",
  "SERVER_ERROR",
  // Auth / account
  "EMAIL_TAKEN",
  "INVALID_CREDENTIALS",
  "SESSION_EXPIRED",
  "CURRENT_PASSWORD_WRONG",
  "PASSWORD_UNCHANGED",
  "RESET_LINK_INVALID",
  "PERMISSION_DENIED",
  "DEMO_READ_ONLY",
  // Admin: users
  "USER_NOT_FOUND",
  "CANNOT_CHANGE_OWN_ACCOUNT",
  "LAST_ADMIN",
  // Cart / checkout / orders / payment
  "PRODUCT_UNAVAILABLE",
  "NOT_ENOUGH_STOCK",
  "STOCK_CHANGED",
  "CART_EMPTY",
  "CHECKOUT_IN_PROGRESS",
  "ORDER_NOT_FOUND",
  "ORDER_ALREADY_PROCESSED",
  "ORDER_NOT_PAYABLE",
  "ORDER_FORBIDDEN",
  "ORDER_CHANGED",
  "ORDER_TRANSITION_INVALID",
  "NO_PENDING_CASH_PAYMENT",
  "ONLINE_PAYMENT_UNAVAILABLE",
  "PAYMENT_SERVICE_DOWN",
  // Coupons
  "COUPON_INVALID",
  "COUPON_EXPIRED",
  "COUPON_USED_UP",
  "COUPON_MIN_ORDER",
  "COUPON_EXISTS",
  // Reviews
  "REVIEW_NOT_PURCHASED",
  "REVIEW_DUPLICATE",
  "REVIEW_NOT_YOURS",
  "REVIEW_EDIT_WINDOW",
  // Part requests
  "CONTACT_NAME_REQUIRED",
  // Admin catalog
  "CATEGORY_EXISTS",
  "CATEGORY_HAS_PRODUCTS",
  "BRAND_EXISTS",
  "BRAND_HAS_PRODUCTS",
  "NO_FILE",
  "IMAGE_TYPE",
  "IMAGE_INVALID",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];
export type ErrorParams = Record<string, string | number>;

// Body for a Nest HttpException: throw new BadRequestException(apiError(...)).
export function apiError(code: ErrorCode, message: string, params?: ErrorParams) {
  return { code, message, ...(params && { params }) };
}

// Code for an error a handler didn't label (validation, 404 from a guard,
// throttling...), by HTTP status.
export function defaultCode(status: number, validation: boolean): ErrorCode {
  if (validation) return "VALIDATION_FAILED";
  if (status === 429) return "RATE_LIMITED";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status >= 500) return "SERVER_ERROR";
  return "BAD_REQUEST";
}
