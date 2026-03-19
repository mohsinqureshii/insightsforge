# InsightForge – Project Conventions & Developer Guide

## Project Overview
InsightForge is a multi-tenant analytics SaaS platform built with Next.js 14 (App Router), Prisma, PostgreSQL, Redis, and NextAuth v5.

## Directory Structure
```
src/
  app/                  # Next.js App Router pages & API routes
    (auth)/             # Public auth pages (login, register, etc.)
    (dashboard)/        # Protected app pages
    api/                # API route handlers
      auth/             # NextAuth + registration + MFA
      v1/               # Versioned REST API
  components/
    ui/                 # shadcn/ui base components
    auth/               # Auth-specific components
    layout/             # Sidebar, Header, etc.
    charts/             # Chart components
    dashboard/          # Dashboard widgets
  lib/                  # Server-side utilities
    auth.ts             # NextAuth config
    auth-utils.ts       # Password hashing, JWT
    prisma.ts           # Prisma singleton
    redis.ts            # Redis singleton
    tenant.ts           # Tenant context helpers
    rbac.ts             # Permission checking
  types/
    insightsforge.ts    # All shared TypeScript types
  middleware.ts         # Auth + tenant middleware
prisma/
  schema.prisma         # Database schema
  seed.ts               # Database seeder
```

## Coding Conventions

### TypeScript
- Strict mode is enabled; never use `any` – use `unknown` and narrow types
- All API handlers must have explicit return types
- Use Zod for all request body validation
- Prefer `type` over `interface` for data shapes; use `interface` for extensible contracts
- All async functions must handle errors explicitly

### Naming Conventions
- Files: `kebab-case.ts` / `PascalCase.tsx` for components
- Variables/functions: `camelCase`
- Types/Interfaces: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Database tables: `snake_case` with `if_` prefix for app tables
- Prisma models: `PascalCase`

### API Routes
- All versioned API routes live under `/api/v1/`
- Every response must include `{ success: boolean, data?: T, error?: string }`
- Use HTTP status codes correctly: 200, 201, 400, 401, 403, 404, 409, 422, 500
- Rate limiting headers must be set on all public endpoints
- All mutations must validate CSRF or use NextAuth session tokens

### Authentication & Authorization
- Use `getServerSession(authOptions)` in Server Components / API routes
- Never expose password hashes or secrets in API responses
- MFA is TOTP-based (otpauth library)
- Session tokens are JWT, stored in httpOnly cookies
- API keys use `sha256(key)` for storage, never plaintext

### RBAC Roles (highest to lowest)
1. `super_admin` – Platform administrator
2. `tenant_admin` – Full tenant access
3. `analytics_admin` – Manage data sources and all reports
4. `builder` – Create/edit reports and dashboards
5. `viewer` – Read-only access to shared content
6. `api_user` – Programmatic access only

### Multi-Tenancy
- Every DB query in app context must be scoped to `tenantId`
- Tenant is resolved from: subdomain → session → header `X-Tenant-ID`
- Never allow cross-tenant data access
- Tenant slug is used for subdomain routing: `{slug}.insightsforge.io`

### Error Handling
- Use structured logging with `pino`
- Never expose stack traces to clients in production
- API errors return: `{ success: false, error: string, code?: string }`
- Database errors must be caught and mapped to appropriate HTTP codes

### Security
- All user inputs sanitized before DB queries
- SQL queries use Prisma parameterized queries only (no raw SQL with user input)
- File uploads validated by MIME type and size before processing
- Encryption key for sensitive fields: AES-256 via `crypto-js`
- CORS restricted to known origins in production

### Component Patterns
- Server Components by default; use `'use client'` only when needed
- Form state managed with `react-hook-form` + Zod resolver
- Toast notifications via `sonner`
- Loading states use Suspense boundaries
- Charts: ECharts via `echarts-for-react`

### State Management
- Server state: `@tanstack/react-query`
- Global client state: `zustand` stores
- Form state: `react-hook-form`
- URL state: Next.js `useSearchParams`

### Testing
- Unit tests: `vitest` with `@vitest/ui`
- E2E tests: `@playwright/test`
- Test files: `*.test.ts` / `*.spec.ts` colocated or in `__tests__/`
- Mock Prisma with `vitest.mock` – never hit real DB in unit tests

### Git Conventions
- Branch: `feature/IF-{ticket}-short-description`
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`)
- PRs require passing CI and one approval

### Environment Variables
- All env vars documented in `.env.example`
- Server-only vars never prefixed with `NEXT_PUBLIC_`
- Validate env vars at startup using a Zod schema in `src/lib/env.ts`

### Performance
- Use `React.cache()` for deduplicating server-side fetches
- Images via `next/image` with proper `sizes` prop
- Route-level code splitting via dynamic imports for heavy components (Monaco, ECharts)
- Redis caching for expensive queries (TTL documented per query)

## Database Schema Conventions
- All tables have `id` (CUID), `created_at`, `updated_at`
- Soft-delete: `deleted_at` column where applicable
- App tables prefixed with `if_` to avoid conflicts with NextAuth tables
- Foreign keys always cascade or set-null explicitly
- Indexes on all foreign keys and frequently queried columns

## Deployment
- Docker Compose for local dev (Postgres 16 + Redis 7)
- Production: Containerized via Dockerfile (multi-stage build)
- CI: GitHub Actions (lint → type-check → test → build)
- DB migrations run automatically on deploy via `prisma migrate deploy`
