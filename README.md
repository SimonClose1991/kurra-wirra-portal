# Staff Induction Portal

## Overview

A full-stack staff induction and SOP management portal. Staff log in, read documents, tick off completion, and digitally sign each document. Admins manage all content and view everyone's progress.

## Deployment

See **DEPLOY.md** for step-by-step Render + GitHub deployment. Config lives in **render.yaml**; env vars are documented in **.env.example**.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/induction-app)
- **API framework**: Express 5 (artifacts/api-server)
- **Auth**: Clerk (standalone app — see DEPLOY.md)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle); frontend served by the API in production
- **Object storage**: S3-compatible (Cloudflare R2 / AWS S3) via AWS SDK v3
- **Email**: SMTP via Nodemailer
- **Hosting**: Render (see DEPLOY.md and render.yaml)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Features

- Staff can read documents and sign/complete them per category
- Staff can fill in custom forms within a category and submit them (one submission per form)
- Admin can build forms with custom fields (text, email, date, phone, number, textarea, select, checkbox)
- Admin can view all staff submissions per form in a table
- Admin manages modules (sections), categories, documents, and forms via Manage Content

## Database Schema

- `sections` — top-level sections (Induction Forms, SOPs)
- `categories` — sub-categories within sections (e.g. Chainsaw Use under SOPs)
- `documents` — individual documents within categories (with optional file URL or text content)
- `forms` — fillable forms within categories (admin-defined)
- `form_fields` — individual fields within a form (label, type, required, options)
- `form_submissions` — staff responses to forms (one per user per form, JSON blob)
- `completions` — per-user document read/sign records (clerkUserId + documentId + signatureName)
- `users` — user records synced from Clerk (with role: admin/staff)

## Features

- **Staff**: Log in, view sections/categories/documents, mark each document as read and sign with their full name
- **Admin**: View all users' progress, manage sections/categories/documents (CRUD), promote/demote users
- **Sections**: Induction Forms, SOPs
- **SOP Categories**: Chainsaw Use, Fencing, Cattle Handling, Sheep Handling

## Role System

- First user to sign up becomes admin automatically
- Admins can grant/revoke admin role for other users via the admin panel

## API Routes

- GET/POST /api/sections — list/create sections
- PATCH/DELETE /api/sections/:id — update/delete section
- GET/POST /api/categories — list/create categories (filter by ?sectionId=)
- PATCH/DELETE /api/categories/:id — update/delete category
- GET/POST /api/documents — list/create documents (filter by ?categoryId=)
- GET/PATCH/DELETE /api/documents/:id — get/update/delete document
- GET/POST /api/completions — get/create completions (filter by ?userId= for admin)
- DELETE /api/completions/:id — delete completion (admin)
- GET /api/me — current user profile and role
- GET /api/admin/users — all users with progress (admin)
- PATCH /api/admin/users/:clerkUserId/role — update user role (admin)
- GET /api/progress/summary — overall stats (admin)
