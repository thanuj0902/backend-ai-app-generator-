import { ValidationError } from "./errors"

export function requireFields<T extends Record<string, any>>(
  body: T,
  fields: (keyof T)[],
): void {
  for (const field of fields) {
    const val = body[field]
    if (val === undefined || val === null || val === "") {
      throw new ValidationError(`Field "${String(field)}" is required`)
    }
    if (typeof val === "string" && val.trim().length === 0) {
      throw new ValidationError(`Field "${String(field)}" cannot be empty`)
    }
  }
}

export function parseBody<T>(request: Request): Promise<T> {
  return request.clone().json() as Promise<T>
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function sanitizeString(input: string): string {
  return input.trim()
    .replace(/[<>]/g, "")
    .substring(0, 1000)
}

export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  allowedKeys: (keyof T)[],
): Partial<T> {
  const sanitized: Partial<T> = {}
  for (const key of allowedKeys) {
    if (obj[key] !== undefined) {
      sanitized[key] = obj[key]
    }
  }
  return sanitized
}
