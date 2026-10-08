"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { apiFetch, readApiError } from "@/lib/api";
import { useApiError } from "@/lib/use-api-error";
import { useAdminList } from "@/lib/admin-list";
import { useAuth } from "@/context/AuthContext";
import { Pager, SearchBox } from "@/components/admin/ListControls";

type Role = "CUSTOMER" | "ADMIN";
type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
  marketingOptIn: boolean;
  createdAt: string;
  _count: { orders: number };
};

type Filter = "" | "ADMIN" | "CUSTOMER" | "optin";
const FILTERS: Filter[] = ["", "ADMIN", "CUSTOMER", "optin"];
const EMPTY_FORM = { firstName: "", lastName: "", email: "", password: "", role: "CUSTOMER" as Role };

// Users: who has an account, who may run the admin, who agreed to offers.
// The admin can add an account (with a temporary password the person then
// changes), make someone admin or customer, and delete. Deleting someone
// with orders anonymises them so sales history stays (backend:
// users/admin-users.service.ts). Nobody can change or delete their own
// account here, and the last admin can't be removed.
export default function AdminUsersPage() {
  const t = useTranslations("AdminUsers");
  const tc = useTranslations("AdminCommon");
  const locale = useLocale();
  const apiError = useApiError();
  const { user: me } = useAuth();
  const [filter, setFilter] = useState<Filter>("");
  const list = useAdminList<User, { optedIn: number }>("/users/admin/all", {
    role: filter === "ADMIN" || filter === "CUSTOMER" ? filter : "",
    optIn: filter === "optin" ? "yes" : "",
  });
  const { items: users, data, reload } = list;
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [notice, setNotice] = useState<string | null>(null);

  const filterLabel = (f: Filter) =>
    f === "" ? t("all") : f === "optin" ? `${t("optedIn")} · ${data?.optedIn ?? 0}` : t(`role.${f}`);

  async function act(id: string, run: () => Promise<Response>, done?: (res: Response) => Promise<void>) {
    setError(null);
    setNotice(null);
    setBusyId(id);
    const res = await run();
    if (!res.ok) setError(apiError(await readApiError(res), tc("genericError")));
    else {
      await done?.(res);
      await reload();
    }
    setBusyId(null);
  }

  const setRole = (u: User, role: Role) =>
    act(u.id, () => apiFetch(`/users/admin/${u.id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }));

  function remove(u: User) {
    const name = `${u.firstName} ${u.lastName}`;
    const message = u._count.orders > 0 ? t("deleteConfirmOrders", { name, count: u._count.orders }) : t("deleteConfirm", { name });
    if (!confirm(message)) return;
    act(
      u.id,
      () => apiFetch(`/users/admin/${u.id}`, { method: "DELETE" }),
      async (res) => setNotice((await res.json()).anonymized ? t("anonymized", { name }) : t("deleted", { name })),
    );
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await act("new", () => apiFetch("/users/admin", { method: "POST", body: JSON.stringify(form) }), async () => {
      setNotice(t("created", { email: form.email }));
      setForm(EMPTY_FORM);
      setAdding(false);
    });
  }

  async function exportCsv() {
    const res = await apiFetch("/users/admin/opt-in.csv");
    if (!res.ok) return setError(apiError(await readApiError(res), tc("genericError")));
    const url = URL.createObjectURL(await res.blob());
    Object.assign(document.createElement("a"), { href: url, download: "clients-offres.csv" }).click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="admin-title">
          {t("title")} {data && <span className="text-xl font-semibold text-steel">{data.total}</span>}
        </h1>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportCsv} className="btn-outline h-11">{t("exportOptIn")}</button>
          <button type="button" onClick={() => setAdding((a) => !a)} aria-expanded={adding} className="btn-primary h-11">
            {adding ? tc("cancel") : t("add")}
          </button>
        </div>
      </div>

      {adding && (
        <form onSubmit={create} className="admin-card grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
          <p className="text-steel sm:col-span-2">{t("addIntro")}</p>
          <label className="admin-label">
            {t("firstName")}
            <input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="admin-input" />
          </label>
          <label className="admin-label">
            {t("lastName")}
            <input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="admin-input" />
          </label>
          <label className="admin-label">
            {t("email")}
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="admin-input" />
          </label>
          <label className="admin-label">
            {t("tempPassword")}
            <input required minLength={10} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="admin-input" />
            <span className="text-sm font-normal text-steel">{t("tempPasswordHint")}</span>
          </label>
          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 font-semibold text-ink">{t("roleLabel")}</legend>
            <div className="flex flex-wrap gap-2">
              {(["CUSTOMER", "ADMIN"] as const).map((r) => (
                <label key={r} className="cursor-pointer">
                  <input type="radio" name="role" value={r} checked={form.role === r} onChange={() => setForm({ ...form, role: r })} className="peer sr-only" />
                  <span className="admin-pill peer-checked:border-2 peer-checked:border-ink peer-checked:bg-[#F6E6C8] peer-checked:font-bold">{t(`role.${r}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <button type="submit" disabled={busyId === "new"} className="btn-primary h-11 sm:col-span-2">
            {busyId === "new" ? tc("adding") : t("create")}
          </button>
        </form>
      )}

      {error && <p role="alert" className="rounded-[10px] bg-[#F1DCD5] p-3 text-sm text-rust-dark">{error}</p>}
      {notice && <p role="status" className="rounded-[10px] bg-stock-bg p-3 text-sm text-stock">{notice}</p>}

      <div className="flex flex-col gap-3">
        <SearchBox value={list.search} onChange={list.setSearch} placeholder={t("searchPlaceholder")} />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button key={f || "all"} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={filter === f ? "admin-pill-on" : "admin-pill"}>
              {filterLabel(f)}
            </button>
          ))}
        </div>
      </div>

      {list.loading ? (
        <p className="text-steel">{tc("loading")}</p>
      ) : users.length === 0 ? (
        <p className="admin-empty">{t("empty")}</p>
      ) : (
        <ul className="admin-card overflow-hidden divide-y divide-sand">
          {users.map((u) => {
            const self = u.id === me?.id;
            const busy = busyId === u.id;
            return (
              <li key={u.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3.5">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-bold text-ink">
                    {u.firstName} {u.lastName}
                    {u.role === "ADMIN" && <span className="ml-2 rounded-full bg-ink px-2 text-xs font-bold text-paper">{t("role.ADMIN")}</span>}
                    {u.marketingOptIn && <span className="ml-2 rounded-full bg-stock-bg px-2 text-xs font-bold text-stock">{t("optInBadge")}</span>}
                    {self && <span className="ml-2 text-sm font-normal text-steel">({t("you")})</span>}
                  </span>
                  <span className="truncate text-sm text-steel">
                    {[u.email, u.phone].filter(Boolean).join(" · ")} · {t("orders", { count: u._count.orders })} ·{" "}
                    {t("since", { date: new Date(u.createdAt).toLocaleDateString(locale) })}
                  </span>
                </div>
                {!self && (
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm font-semibold text-steel">
                      {t("roleLabel")}
                      <select value={u.role} disabled={busy} onChange={(e) => setRole(u, e.target.value as Role)} className="admin-input w-auto disabled:opacity-50">
                        <option value="CUSTOMER">{t("role.CUSTOMER")}</option>
                        <option value="ADMIN">{t("role.ADMIN")}</option>
                      </select>
                    </label>
                    <button type="button" onClick={() => remove(u)} disabled={busy} className="link-danger">
                      {busy ? "…" : tc("delete")}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {data && <Pager page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPage={list.setPage} />}
    </div>
  );
}
