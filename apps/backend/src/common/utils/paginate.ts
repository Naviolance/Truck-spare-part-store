// One page of an admin list, in the same shape the public catalog uses.
export type Page<T> = { items: T[]; total: number; page: number; limit: number; totalPages: number };

export const ADMIN_PAGE_SIZE = 25;

// Runs the page query and the count together. `fetch` gets Prisma's
// skip/take for the requested page.
export async function paginate<T>(
  query: { page?: number; limit?: number },
  fetch: (args: { skip: number; take: number }) => Promise<T[]>,
  count: () => Promise<number>,
): Promise<Page<T>> {
  const page = query.page ?? 1;
  const limit = query.limit ?? ADMIN_PAGE_SIZE;
  const [items, total] = await Promise.all([fetch({ skip: (page - 1) * limit, take: limit }), count()]);
  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

// The admin search box: trimmed, or undefined when empty.
export const searchTerm = (search?: string) => search?.trim() || undefined;
