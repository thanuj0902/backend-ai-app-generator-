import { ValidationError } from "./errors"

export function requireFields<T extends Record<string, any>>(
  body: T,
  fields: (keyof T)[],
): void {
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
      throw new ValidationError(`Field "${String(field)}" is required`)
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
