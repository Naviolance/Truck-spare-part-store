"use client";
import { useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ApiRequestError, type ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/money";

// Turns an API error into a sentence in the visitor's language:
//   const apiError = useApiError();
//   setError(apiError(await readApiError(res), t("failed")));
// The backend's `code` picks the translation (messages/*.json "ApiErrors");
// `params` fill it in (amounts are formatted as money). With no known code:
// the server's English message on /en, otherwise the translated fallback —
// a French customer never gets an English sentence.
export function useApiError() {
  const t = useTranslations("ApiErrors");
  const locale = useLocale();
  return useCallback(
    (error: ApiError | unknown, fallback: string): string => {
      const api: ApiError | null =
        error instanceof ApiRequestError ? error.api : error && typeof error === "object" && !(error instanceof Error) ? (error as ApiError) : null;
      if (api?.code && t.has(api.code)) {
        const params = Object.fromEntries(
          Object.entries(api.params ?? {}).map(([key, value]) => [key, key === "amount" ? formatMoney(value) : value]),
        );
        return t(api.code, params);
      }
      if (locale === "en" && api?.message) return api.message;
      return fallback;
    },
    [t, locale],
  );
}
