"use client";
import { Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { apiFetch, readApiError } from "@/lib/api";
import { useApiError } from "@/lib/use-api-error";
import { useAdminList } from "@/lib/admin-list";
import { formatMoney } from "@/lib/money";
import { Pager, SearchBox } from "@/components/admin/ListControls";
import { isUnoptimizableImage } from "@/lib/image";

type Product = {
  id: string; name: string; slug: string; price: string; status: string; quantity: number; createdAt: string;
  partNumber: string | null;
  category: { name: string }; brand: { name: string } | null;
  images: { url: string }[];
};

type Filter = "" | "out" | "PUBLISHED" | "DRAFT" | "ARCHIVED";
const FILTERS: Filter[] = ["", "out", "PUBLISHED", "DRAFT", "ARCHIVED"];

// Products (redesign step 6, option B): the list on the left, a quick edit
// panel on the right (price, stock, published/draft) so daily stock updates
// don't need the full form. Everything else: "full form" link.
export default function AdminProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductsBoard />
    </Suspense>
  );
}

function ProductsBoard() {
  const t = useTranslations("AdminProducts");
  const tc = useTranslations("AdminCommon");
  const apiError = useApiError();
  // ?stock=out: the dashboard's "show them" link.
  const [filter, setFilter] = useState<Filter>(useSearchParams().get("stock") === "out" ? "out" : "");
  const list = useAdminList<Product, { outOfStock: number }>("/products/admin/all", {
    status: filter === "out" ? "" : filter,
    stock: filter === "out" ? "out" : "",
  });
  const { items: products, data, reload: load } = list;
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = products.find((p) => p.id === selectedId) ?? null;
  const panel = useRef<HTMLElement>(null);

  async function remove(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    setPendingId(id);
    const res = await apiFetch(`/products/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert(apiError(await readApiError(res), t("deleteFailed")));
    } else if ((await res.json().catch(() => ({}))).archived) {
      alert(t("archivedInstead"));
    }
    if (selectedId === id) setSelectedId(null);
    await load();
    setPendingId(null);
  }


  const outOfStock = data?.outOfStock ?? 0;
  const filterLabel = (f: Filter) =>
    f === "" ? tc("allStatuses") : f === "out" ? `${t("outOfStock")} · ${outOfStock}` : tc(`productStatus.${f}`);
  const pill = (on: boolean, warn = false) =>
    `h-11 rounded-full px-4 font-semibold ${on ? "bg-ink text-paper" : warn ? "bg-[#F1DCD5] text-[#8A3821] font-bold" : "border border-[#BDB5A6] bg-card text-ink hover:border-ink"}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl sm:text-[38px] font-bold text-ink">
          {t("title")} {data && <span className="text-xl font-semibold text-steel">{data.total}</span>}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/import" className="btn-outline h-11">{t("importSpreadsheet")}</Link>
          <Link href="/admin/products/create" className="btn-primary h-11">{t("newProduct")}</Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <section aria-label={t("listLabel")} className="flex min-w-0 flex-col gap-3">
          <SearchBox value={list.search} onChange={list.setSearch} placeholder={t("searchPlaceholder")} />
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button key={f || "all"} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={pill(filter === f, f === "out" && outOfStock > 0)}>
                {filterLabel(f)}
              </button>
            ))}
          </div>
          {list.loading ? (
            <p className="text-steel">{tc("loading")}</p>
          ) : products.length === 0 ? (
            <p className="rounded-[14px] border border-dashed border-line bg-card p-6 text-center text-steel">
              {list.searching || filter ? t("noMatch") : t("empty")}
            </p>
          ) : (
            <ul className="overflow-hidden rounded-[14px] border border-line bg-card">
              {products.map((p, i) => {
                const on = p.id === selectedId;
                return (
                  <li key={p.id} className={i > 0 ? "border-t border-sand" : ""}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        setSelectedId(p.id);
                        requestAnimationFrame(() => panel.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
                      }}
                      className={`flex w-full items-center gap-3 border-l-4 px-3.5 py-3 text-left ${on ? "border-amber bg-[#F6E6C8]" : "border-transparent hover:bg-sand/60"}`}
                    >
                      <Thumb url={p.images[0]?.url} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold text-ink">
                          {p.name}
                          {p.status !== "PUBLISHED" && (
                            <span className="ml-2 rounded-full bg-[#E1E4E7] px-2 text-xs font-bold text-ink">{tc(`productStatus.${p.status}`)}</span>
                          )}
                        </span>
                        <span className="block truncate text-sm text-steel">
                          {[p.brand?.name, p.category.name, p.partNumber].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-bold text-ink">{formatMoney(p.price)}</span>
                        <span className={`block text-sm font-bold ${p.quantity === 0 ? "text-[#8A3821]" : p.quantity <= 2 ? "text-amber-dark" : "text-stock"}`}>
                          {p.quantity === 0 ? t("outOfStock") : t("inStock", { count: p.quantity })}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {data && <Pager page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPage={list.setPage} />}
        </section>

        {/* On phones the panel shows above the list once a product is picked. */}
        <aside
          ref={panel}
          aria-label={t("quickEdit")}
          className={`${selected ? "" : "hidden lg:block"} order-first scroll-mt-4 lg:order-none lg:sticky lg:top-4`}
        >
          {selected ? (
            <QuickEdit
              key={selected.id}
              product={selected}
              deleting={pendingId === selected.id}
              onSaved={load}
              onDelete={() => remove(selected.id)}
              onClose={() => setSelectedId(null)}
              apiError={apiError}
            />
          ) : (
            <p className="rounded-[14px] border border-dashed border-line bg-card p-6 text-center text-steel">{t("pickHint")}</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function Thumb({ url, size = 44 }: { url?: string; size?: number }) {
  return (
    <span className="relative shrink-0 overflow-hidden rounded-lg bg-sand" style={{ width: size, height: size }}>
      {url && <Image src={url} alt="" fill sizes={`${size}px`} unoptimized={isUnoptimizableImage(url)} className="object-cover" />}
    </span>
  );
}

function QuickEdit({
  product,
  deleting,
  onSaved,
  onDelete,
  onClose,
  apiError,
}: {
  product: Product;
  deleting: boolean;
  onSaved: () => Promise<void> | void;
  onDelete: () => void;
  onClose: () => void;
  apiError: ReturnType<typeof useApiError>;
}) {
  const t = useTranslations("AdminProducts");
  const tc = useTranslations("AdminCommon");
  const [price, setPrice] = useState(String(Math.round(Number(product.price))));
  const [quantity, setQuantity] = useState(String(product.quantity));
  const [status, setStatus] = useState(product.status);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const input = "h-12 w-full rounded-[10px] border border-[#BDB5A6] bg-white px-3 text-base text-ink focus:border-ink focus:outline-none";
  const statuses = product.status === "ARCHIVED" ? ["PUBLISHED", "DRAFT", "ARCHIVED"] : ["PUBLISHED", "DRAFT"];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await apiFetch(`/products/${product.id}`, {
      method: "PATCH",
      body: JSON.stringify({ price: Number(price), quantity: Number(quantity), status }),
    });
    setSaving(false);
    if (!res.ok) {
      setMessage({ ok: false, text: apiError(await readApiError(res), t("saveFailed")) });
      return;
    }
    setMessage({ ok: true, text: t("saved") });
    await onSaved();
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4 rounded-[14px] border-2 border-ink bg-card p-5">
      <div className="flex items-start gap-3">
        <Thumb url={product.images[0]?.url} size={64} />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-ink">{product.name}</p>
          <p className="text-sm text-steel">
            {[product.brand?.name, product.category.name].filter(Boolean).join(" · ")}
            {product.status === "PUBLISHED" && (
              <>
                {" · "}
                <a href={`/fr/products/${product.slug}`} target="_blank" rel="noopener noreferrer" className="underline">{t("viewInShop")}</a>
              </>
            )}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label={tc("close")} className="h-9 w-9 shrink-0 rounded-full text-xl text-steel hover:bg-sand">×</button>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <label className="flex flex-col gap-1.5 font-semibold text-ink">
          {t("priceFcfa")}
          <input type="number" inputMode="numeric" min={0} step={1} required value={price} onChange={(e) => setPrice(e.target.value)} className={input} />
        </label>
        <label className="flex flex-col gap-1.5 font-semibold text-ink">
          {t("stock")}
          <input type="number" inputMode="numeric" min={0} step={1} required value={quantity} onChange={(e) => setQuantity(e.target.value)} className={input} />
        </label>
      </div>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 font-semibold text-ink">{tc("status")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {statuses.map((s) => (
            <label key={s} className="cursor-pointer">
              <input type="radio" name="quick-status" value={s} checked={status === s} onChange={() => setStatus(s)} className="peer sr-only" />
              <span className="flex h-11 items-center justify-center rounded-[10px] border border-[#BDB5A6] font-semibold text-ink peer-checked:border-2 peer-checked:border-ink peer-checked:bg-stock-bg peer-focus-visible:ring-2 peer-focus-visible:ring-amber">
                {tc(`productStatus.${s}`)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {message && (
        <p role={message.ok ? "status" : "alert"} className={`text-sm font-semibold ${message.ok ? "text-stock" : "text-[#8A3821]"}`}>{message.text}</p>
      )}
      <button type="submit" disabled={saving} className="btn-primary h-12 text-base">
        {saving ? tc("saving") : tc("save")}
      </button>
      <Link href={`/admin/products/${product.id}/edit`} className="text-center font-bold text-ink underline underline-offset-2">
        {t("fullForm")}
      </Link>
      <button type="button" onClick={onDelete} disabled={deleting} className="text-sm text-[#8A3821] underline underline-offset-2 disabled:opacity-50">
        {deleting ? tc("deleting") : t("deleteProduct")}
      </button>
    </form>
  );
}
