"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { apiFetch, readError } from "@/lib/api";
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

const COLUMNS: [string, string][] = [
  ["name *", "Product name"],
  ["category *", "e.g. Brakes — created if new (French names of existing categories work too)"],
  ["condition *", "NEW / USED / RECONDITIONED (or Neuf / Occasion / Reconditionné)"],
  ["price *", "In FCFA, whole number: 45000 or 45 000"],
  ["quantity *", "Units in stock (0 = listed as out of stock)"],
  ["brand", "e.g. Bosch — created if new"],
  ["partNumber", "Re-uploading a row with the same part number + brand UPDATES that product"],
  ["crossReference", "Other part numbers, separated by |"],
  ["vehicles", "Make / Model / 2012-2024 / engine — several separated by |"],
  ["description, descriptionFr", "Optional. Empty cells keep the current text when updating"],
  ["conditionNotes", "Recommended for used parts"],
  ["status", "Published or Draft (empty: the choice below)"],
];

// Spreadsheet import: choose a file -> see exactly what will happen ->
// confirm. The backend applies all rows or none (one transaction).
export default function AdminImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState<"preview" | "commit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Plan["summary"] | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<"PUBLISHED" | "DRAFT">("PUBLISHED");

  async function downloadTemplate() {
    const res = await apiFetch("/products/import/template");
    if (!res.ok) return setError(await readError(res, "Couldn't download the template"));
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
    if (!res.ok) return setError(await readError(res, "Couldn't read this file"));
    setPlan(await res.json());
  }

  async function commit() {
    if (!file || !plan) return;
    setBusy("commit");
    setError(null);
    const res = await send("commit", file);
    setBusy(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (body?.plan) setPlan(body.plan); // the data changed since the preview
      return setError(typeof body?.message === "string" ? body.message : "Import failed — nothing was imported");
    }
    setDone((await res.json()).summary);
    setPlan(null);
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const canImport = plan && plan.errors.length === 0 && plan.rows.length > 0;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-display font-bold text-ink tracking-tight mb-1">Import products</h1>
      <p className="text-sm text-steel mb-6">
        Add or update many products at once from a spreadsheet. You&apos;ll see exactly what will happen before anything is saved,
        and the import is all-or-nothing: if any row has a problem, nothing changes.
      </p>

      <section className="bg-white border border-steel-light rounded-lg p-4 mb-6">
        <h2 className="font-semibold text-ink mb-2">1. Prepare your spreadsheet</h2>
        <ol className="text-sm text-steel list-decimal pl-5 space-y-1 mb-3">
          <li>Download the template and open it in Excel (or Google Sheets / LibreOffice).</li>
          <li>Keep the first line (column titles), replace the example rows with your parts.</li>
          <li>Save as <strong>CSV</strong> (File &gt; Save as &gt; CSV). Any CSV option works, including French Excel&apos;s default.</li>
        </ol>
        <button onClick={downloadTemplate} className="bg-ink text-white text-sm px-4 py-2 rounded-lg">Download template</button>
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-ink font-medium">Columns explained</summary>
          <table className="mt-2 w-full text-left">
            <tbody className="divide-y divide-steel-light">
              {COLUMNS.map(([col, help]) => (
                <tr key={col}>
                  <td className="py-1.5 pr-4 font-mono text-xs text-ink whitespace-nowrap align-top">{col}</td>
                  <td className="py-1.5 text-steel">{help}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-steel mt-2">* required. Photos are added afterwards from each product&apos;s Edit page.</p>
        </details>
      </section>

      <section className="bg-white border border-steel-light rounded-lg p-4 mb-6">
        <h2 className="font-semibold text-ink mb-2">2. Check the file</h2>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          aria-label="Spreadsheet (CSV)"
          onChange={(e) => e.target.files?.[0] && preview(e.target.files[0])}
          className="text-sm"
        />
        {busy === "preview" && <p className="text-sm text-steel mt-2">Checking…</p>}
      </section>

      {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 mb-6">{error}</p>}

      {done && (
        <div role="status" className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6 text-sm text-emerald-800">
          Imported: {done.create} new product{done.create === 1 ? "" : "s"}, {done.update} updated.{" "}
          <Link href="/admin/products" className="underline">See products</Link>. The public site shows the changes within about 5 minutes.
        </div>
      )}

      {plan && (
        <section className="bg-white border border-steel-light rounded-lg p-4 space-y-4">
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">{plan.summary.create} new</span>
            <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800">{plan.summary.update} updated</span>
            <span className={`px-2 py-1 rounded-full ${plan.errors.length ? "bg-red-100 text-red-800" : "bg-steel-light text-steel"}`}>
              {plan.errors.length} error{plan.errors.length === 1 ? "" : "s"}
            </span>
            {plan.warnings.length > 0 && <span className="px-2 py-1 rounded-full bg-amber/20 text-ink">{plan.warnings.length} warning{plan.warnings.length === 1 ? "" : "s"}</span>}
          </div>

          {plan.errors.length > 0 && (
            <div>
              <h3 className="font-semibold text-red-800 mb-1">Fix these, then choose the file again</h3>
              <IssueTable issues={plan.errors} tone="error" />
            </div>
          )}

          {(plan.newCategories.length > 0 || plan.newBrands.length > 0 || plan.newVehicles.length > 0) && (
            <div className="text-sm">
              <h3 className="font-semibold text-ink mb-1">Will also be created</h3>
              {plan.newCategories.length > 0 && <p className="text-steel">Categories: {plan.newCategories.join(", ")}</p>}
              {plan.newBrands.length > 0 && <p className="text-steel">Brands: {plan.newBrands.join(", ")}</p>}
              {plan.newVehicles.length > 0 && <p className="text-steel">Trucks: {plan.newVehicles.join(", ")}</p>}
              <p className="text-xs text-steel mt-1">Check the spelling — a typo here creates a duplicate category or brand.</p>
            </div>
          )}

          {plan.warnings.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-ink">Warnings (imported anyway)</summary>
              <IssueTable issues={plan.warnings} tone="warning" />
            </details>
          )}

          {plan.rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-steel">
                  <tr>
                    <th className="py-1 pr-3">Line</th>
                    <th className="py-1 pr-3">Action</th>
                    <th className="py-1 pr-3">Name</th>
                    <th className="py-1 pr-3">Part no.</th>
                    <th className="py-1 pr-3">Category</th>
                    <th className="py-1 pr-3 text-right">Price</th>
                    <th className="py-1 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-steel-light">
                  {plan.rows.slice(0, PREVIEW_ROWS).map((r) => (
                    <tr key={r.line}>
                      <td className="py-1 pr-3 text-steel">{r.line}</td>
                      <td className="py-1 pr-3">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${r.action === "create" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}>
                          {r.action === "create" ? "new" : "update"}
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
              {plan.rows.length > PREVIEW_ROWS && <p className="text-xs text-steel mt-1">…and {plan.rows.length - PREVIEW_ROWS} more rows.</p>}
            </div>
          )}

          <div className="border-t border-steel-light pt-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="text-sm text-steel flex items-center gap-2">
              New products without a status:
              <select value={defaultStatus} onChange={(e) => setDefaultStatus(e.target.value as "PUBLISHED" | "DRAFT")} className="border border-steel-light rounded-lg px-2 py-1">
                <option value="PUBLISHED">publish immediately</option>
                <option value="DRAFT">save as drafts</option>
              </select>
            </label>
            <button
              onClick={commit}
              disabled={!canImport || busy !== null}
              className="sm:ml-auto bg-amber text-ink px-5 py-2 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy === "commit" ? "Importing…" : `Import ${plan.rows.length} product${plan.rows.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function IssueTable({ issues, tone }: { issues: Issue[]; tone: "error" | "warning" }) {
  return (
    <table className="w-full text-sm text-left mt-1">
      <tbody className="divide-y divide-steel-light">
        {issues.slice(0, 200).map((issue, i) => (
          <tr key={i}>
            <td className="py-1 pr-3 text-steel whitespace-nowrap align-top">{issue.line > 0 ? `Line ${issue.line}` : "File"}</td>
            <td className="py-1 pr-3 font-mono text-xs text-steel align-top">{issue.field ?? ""}</td>
            <td className={`py-1 ${tone === "error" ? "text-red-700" : "text-ink"}`}>{issue.message}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
