export interface PaginationParams {
  page: number;
  pageSize: number;
  offset: number;
  limit: number;
  order: [string, "ASC" | "DESC"][];
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

// Builder: lee query y arma params seguros
export function buildPagination(
  query: any,
  allowedSort: string[] = ["id", "createdAt"] // por entidad podés pasar los suyos
): PaginationParams {
  const page = Math.max(parseInt(query.page ?? "1", 10) || 1, 1);

  const rawPageSize = Math.max(parseInt(query.pageSize ?? "10", 10) || 10, 1);
  const MAX_PAGE_SIZE = 100;
  const pageSize = Math.min(rawPageSize, MAX_PAGE_SIZE);

  const offset = (page - 1) * pageSize;

  const sortField = typeof query.sort === "string" && allowedSort.includes(query.sort)
    ? query.sort
    : "id";

  const orderDir: "ASC" | "DESC" =
    String(query.order ?? "asc").toLowerCase() === "desc" ? "DESC" : "ASC";

  return { page, pageSize, offset, limit: pageSize, order: [[sortField, orderDir]] };
}

// Helper para dar una respuesta estándar
export function buildPaginatedResult<T>(
  rows: T[],
  count: number,
  params: PaginationParams
): PaginatedResult<T> {
  return {
    items: rows,
    page: params.page,
    pageSize: params.pageSize,
    totalItems: count,
    totalPages: Math.max(Math.ceil(count / params.pageSize), 1),
  };
}