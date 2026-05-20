# API — Backend & AI Code Generation

Core API service for the App Generator Platform. Handles config parsing, AI-powered code generation, workflow management, and multi-tenant auth.

> This package is part of the [App Generator Platform](../../README.md) monorepo.

## Setup

```bash
# From monorepo root
npm install

# Generate Prisma client
npm run db:generate -w packages/api
npm run db:push -w packages/api

# Start dev server
npm run dev:api
```

## Features

- **Config Parser** — Accepts partial/incomplete configs, fills sensible defaults
- **Dynamic Route Factory** — Creates REST routes from config.apis definition
- **Dynamic Schema Factory** — Generates Sequelize models from config.database.tables
- **AI Code Generation** — Gemini 2.0 Flash / Groq (Llama 3.3) integration
- **Auth** — Clerk integration with JWT, multi-tenancy via orgs
- **Middleware Pipeline** — Logging → Rate Limit → Auth → Validation → Error Handler
- **CSV Import** — Import data with column mapping and error reporting
- **i18n** — Multi-language support with config-driven translations
- **Notifications** — Event-based mock email notifications

## Tech Stack

- Next.js 15, TypeScript
- Prisma + Neon (PostgreSQL)
- Clerk (Auth)
- Gemini 2.0 Flash / Groq (AI)
- Upstash Redis (Rate Limiting)
