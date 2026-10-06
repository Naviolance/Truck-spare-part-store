"use client";
import Image from "next/image";
import { ReactNode, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type Props = {
  mode: "login" | "register";
  // Carried over to the other auth page so switching login <-> register
  // still returns the customer where they were (e.g. checkout).
  next?: string | null;
  children: ReactNode;
};

// Shared by /login and /register — same branded panel and shell on both
// pages so switching between them feels like one auth card changing state.
export function AuthLayout({ mode, next, children }: Props) {
  const t = useTranslations("Auth");
  const isLogin = mode === "login";
  const [imageFailed, setImageFailed] = useState(false);
  const otherPath = isLogin ? "/register" : "/login";

  return (
    <main className="min-h-[calc(100vh-57px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl rounded-xl overflow-hidden shadow-lg flex flex-col sm:flex-row bg-white">
        <div className="relative sm:w-2/5 min-h-[220px] sm:min-h-0 bg-ink flex flex-col justify-between p-8 text-paper overflow-hidden">
          {!imageFailed && (
            <Image
              src="/engine.jpg"
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 40vw"
              className={isLogin ? "object-cover opacity-40" : "object-cover opacity-70 contrast-125 saturate-150"}
              onError={() => setImageFailed(true)}
            />
          )}

          <div className="relative">
            <p className="font-display font-black text-xl tracking-tight">TruckParts</p>
          </div>

          <div className="relative">
            <h2 className="text-2xl font-display font-bold mb-2">
              {isLogin ? t("panelLoginTitle") : t("panelRegisterTitle")}
            </h2>
            <p className="text-steel-light text-sm mb-6">{isLogin ? t("panelLoginBody") : t("panelRegisterBody")}</p>
            <Link href={next ? `${otherPath}?next=${encodeURIComponent(next)}` : otherPath} className="btn-primary">
              {isLogin ? t("panelLoginCta") : t("panelRegisterCta")}
            </Link>
          </div>
        </div>

        <div className="sm:w-3/5 p-8">{children}</div>
      </div>
    </main>
  );
}
