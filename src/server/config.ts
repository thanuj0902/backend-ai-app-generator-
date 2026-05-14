export const APP_NAME = "AppForge"
export const APP_DESCRIPTION = "Describe any app. AI builds it instantly."

export const PAGINATION = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
}

export function getPagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || String(PAGINATION.PAGE)))
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get("limit") || String(PAGINATION.LIMIT))),
  )
  return { page, limit, skip: (page - 1) * limit }
}

export function buildPaginatedResponse<T>(data: T[], total: number, page: number, limit: number) {
  return Response.json({
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  })
}

export function buildSuccessResponse<T>(data: T, status: number = 200) {
  return Response.json(data, { status })
}
