"use client";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { apiFetch, readApiError } from "@/lib/api";
import { useApiError } from "@/lib/use-api-error";
import { formatMoney } from "@/lib/money";

type Issue = { line: number; field?: string; message: string };
type Plan = {
  rows: { line: number; action: "create" | "update"; name: string; partNumber: string | null; brand: string | null; category: string; price: number; quantity: number }[];
  newCategories: string[];
  newBrands: string[];
  newVehicles: string[];
  errors: Issue[];
  warnings: Issue[];
  summary: { create: number; update: number; errors: number };
};

const PREVIEW_ROWS = 50;

// [CSV column name (never translated — it's what the importer accepts), help key in AdminImport.columns]
const COLUMNS: [string, string][] = [
  ["name *", "name"],
  ["category *", "category"],
  ["condition *", "condition"],
  ["price *", "price"],
  ["quantity *", "quantity"],
  ["brand", "brand"],
  ["partNumber", "partNumber"],
  ["crossReference", "crossReference"],
  ["vehicles", "vehicles"],
  ["description, descriptionFr", "description"],
  ["conditionNotes", "conditionNotes"],
  ["status", "status"],
];

// Spreadsheet import: choose a file -> see exactly what will happen ->
// confirm. The backend applies all rows or none (one transaction).
export default function AdminImportPage() {
  const t = useTranslations("AdminImport");
  const apiError = useApiError();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState<"preview" | "commit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Plan["summary"] | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<"PUBLISHED" | "DRAFT">("PUBLISHED");

  async function downloadTemplate() {
    const res = await apiFetch("/products/import/template");
    if (!res.ok) return setError(apiError(await readApiError(res), t("templateFailed")));
    const url = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement("a"), { href: url, download: "truckparts-import-template.csv" });
    a.click();
    URL.revokeObjectURL(url);
  }

  async function send(step: "preview" | "commit", chosen: File) {
    const body = new FormData();
    body.append("file", chosen);
    if (step === "commit") body.append("defaultStatus", defaultStatus);
    return apiFetch(`/products/import/${step}`, { method: "POST", body });
  }

  async function preview(chosen: File) {
    setFile(chosen);
    setPlan(null);
    setDone(null);
    setError(null);
    setBusy("preview");
    const res = await send("preview", chosen);
    setBusy(null);
    if (!res.ok) return setError(apiError(await readApiError(res), t("readFailed")));
    setPlan(await res.json());
  }

  async function commit() {
    if (!file || !plan) return;
    setBusy("commit");
    setError(null);
    const res = await send("commit", file);
    setBusy(null);
    if (!res.ok) {
      const body = await res.clone().json().catch(() => ({}));
      if (body?.plan) setPlan(body.plan); // the data changed since the preview
      return setError(apiError(await readApiError(res), t("importFailed")));
    }
    setDone((await res.json()).summary);
    setPlan(null);
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const canImport = plan && plan.errors.length === 0 && plan.rows.length > 0;

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="admin-title">{t("title")}</h1>
        <p className="text-steel">{t("intro")}</p>
      </div>

      <section className="admin-card p-4 sm:p-5">
        <h2 className="font-display text-[22px] font-bold text-ink mb-2">{t("step1Title")}</h2>
        <ol className="text-sm text-steel list-decimal pl-5 space-y-1 mb-3">
          <li>{t("step1Download")}</li>
          <li>{t("step1Fill")}</li>
          <li>{t.rich("step1Save", { strong: (chunks) => <strong>{chunks}</strong> })}</li>
        </ol>
        <button type="button" onClick={downloadTemplate} className="btn-secondary h-11">{t("downloadTemplate")}</button>
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-ink font-medium">{t("columnsExplained")}</summary>
          <table className="mt-2 w-full text-left">
            <tbody className="divide-y divide-sand">
              {COLUMNS.map(([col, help]) => (
                <tr key={col}>
                  <td className="py-1.5 pr-4 font-mono text-xs text-ink whitespace-nowrap align-top">{col}</td>
                  <td className="py-1.5 text-steel">{t(`columns.${help}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-steel mt-2">{t("columnsFootnote")}</p>
        </details>
      </section>

      <section className="admin-card p-4 sm:p-5">
        <h2 className="font-display text-[22px] font-bold text-ink mb-2">{t("step2Title")}</h2>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          aria-label={t("fileLabel")}
          onChange={(e) => e.target.files?.[0] && preview(e.target.files[0])}
          className="text-sm file:mr-3 file:h-11 file:cursor-pointer file:rounded-[10px] file:border-0 file:bg-amber file:px-4 file:font-bold file:text-ink hover:file:bg-amber-dark"
        />
        {busy === "preview" && <p className="text-sm text-steel mt-2">{t("checking")}</p>}
      </section>

      {error && <p role="alert" className="rounded-[10px] border border-[#E7C3B8] bg-[#F1DCD5] p-3 text-sm text-rust-dark">{error}</p>}

      {done && (
        <div role="status" className="rounded-[10px] bg-stock-bg p-4 text-sm text-stock">
          {t.rich("done", {
            create: done.create,
            update: done.update,
            link: (chunks) => <Link href="/admin/products" className="underline">{chunks}</Link>,
          })}
        </div>
      )}

      {plan && (
        <section className="admin-card p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">{t("summaryNew", { count: plan.summary.create })}</span>
            <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800">{t("summaryUpdated", { count: plan.summary.update })}</span>
            <span className={`px-2 py-1 rounded-full ${plan.errors.length ? "bg-red-100 text-red-800" : "bg-steel-light text-steel"}`}>
              {t("summaryErrors", { count: plan.errors.length })}
            </span>
            {plan.warnings.length > 0 && <span className="px-2 py-1 rounded-full bg-amber/20 text-ink">{t("summaryWarnings", { count: plan.warnings.length })}</span>}
          </div>

          {plan.errors.length > 0 && (
            <div>
              <h3 className="font-semibold text-red-800 mb-1">{t("errorsTitle")}</h3>
              <IssueTable issues={plan.errors} tone="error" />
            </div>
          )}

          {(plan.newCategories.length > 0 || plan.newBrands.length > 0 || plan.newVehicles.length > 0) && (
            <div className="text-sm">
              <h3 className="font-semibold text-ink mb-1">{t("alsoCreated")}</h3>
              {plan.newCategories.length > 0 && <p className="text-steel">{t("newCategories", { list: plan.newCategories.join(", ") })}</p>}
              {plan.newBrands.length > 0 && <p className="text-steel">{t("newBrands", { list: plan.newBrands.join(", ") })}</p>}
              {plan.newVehicles.length > 0 && <p className="text-steel">{t("newVehicles", { list: plan.newVehicles.join(", ") })}</p>}
              <p className="text-xs text-steel mt-1">{t("checkSpelling")}</p>
            </div>
          )}

          {plan.warnings.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-ink">{t("warningsTitle")}</summary>
              <IssueTable issues={plan.warnings} tone="warning" />
            </details>
          )}

          {plan.rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-steel">
                  <tr>
                    <th className="py-1 pr-3">{t("colLine")}</th>
                    <th className="py-1 pr-3">{t("colAction")}</th>
                    <th className="py-1 pr-3">{t("colName")}</th>
                    <th className="py-1 pr-3">{t("colPartNumber")}</th>
                    <th className="py-1 pr-3">{t("colCategory")}</th>
                    <th className="py-1 pr-3 text-right">{t("colPrice")}</th>
                    <th className="py-1 text-right">{t("colQuantity")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand">
                  {plan.rows.slice(0, PREVIEW_ROWS).map((r) => (
                    <tr key={r.line}>
                      <td className="py-1 pr-3 text-steel">{r.line}</td>
                      <td className="py-1 pr-3">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${r.action === "create" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}>
                          {r.action === "create" ? t("actionCreate") : t("actionUpdate")}
                        </span>
                      </td>
                      <td className="py-1 pr-3 text-ink">{r.name}</td>
                      <td className="py-1 pr-3 font-mono text-xs">{r.partNumber ?? "—"}</td>
                      <td className="py-1 pr-3">{r.category}</td>
                      <td className="py-1 pr-3 text-right whitespace-nowrap">{formatMoney(r.price)}</td>
                      <td className="py-1 text-right">{r.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {plan.rows.length > PREVIEW_ROWS && <p className="text-xs text-steel mt-1">{t("moreRows", { count: plan.rows.length - PREVIEW_ROWS })}</p>}
            </div>
          )}

          <div className="border-t border-sand pt-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="text-sm text-steel flex items-center gap-2">
              {t("defaultStatusLabel")}
              <select value={defaultStatus} onChange={(e) => setDefaultStatus(e.target.value as "PUBLISHED" | "DRAFT")} className="admin-input w-auto">
                <option value="PUBLISHED">{t("publishNow")}</option>
                <option value="DRAFT">{t("saveAsDrafts")}</option>
              </select>
            </label>
            <button
              onClick={commit}
              disabled={!canImport || busy !== null}
              className="btn-primary h-11 sm:ml-auto disabled:cursor-not-allowed"
            >
              {busy === "commit" ? t("importing") : t("importButton", { count: plan.rows.length })}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function IssueTable({ issues, tone }: { issues: Issue[]; tone: "error" | "warning" }) {
  const t = useTranslations("AdminImport");
  return (
    <table className="w-full text-sm text-left mt-1">
      <tbody className="divide-y divide-sand">
        {issues.slice(0, 200).map((issue, i) => (
          <tr key={i}>
            <td className="py-1 pr-3 text-steel whitespace-nowrap align-top">{issue.line > 0 ? t("issueLine", { line: issue.line }) : t("issueFile")}</td>
            <td className="py-1 pr-3 font-mono text-xs text-steel align-top">{issue.field ?? ""}</td>
            <td className={`py-1 ${tone === "error" ? "text-red-700" : "text-ink"}`}>{issue.message}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
