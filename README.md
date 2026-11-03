# Classroom Survey

A local-first classroom survey app built with React, TypeScript, and Supabase PostgreSQL. Instructors prepare questions and display a QR code; students answer without signing in.

## Requirements

- Node.js 22 or later
- Docker Desktop

## Local setup

1. Install dependencies with `npm install`.
2. Start Docker Desktop.
3. Run `npm run db:start`. This starts the local Supabase stack, writes its loopback URL and public key to ignored `.env.local`, and provisions a local instructor account.
4. Run `npm run dev` and open `http://127.0.0.1:5173/`.

The top-right **Use demo instructor** button signs in to the local test account (`instructor@uconn.edu` / `123456`). Locally, it only appears in Vite development mode when both the app and Supabase URLs are loopback addresses. The account is created or reset by `npm run db:start` and `npm run db:reset`.

The app and local Supabase APIs are bound to localhost. Student links and QR codes therefore work only in this browser on this computer until productionization. The app intentionally has no deployment or hosting configuration yet.

For a future Render test deployment, enable the demo button with `VITE_ENABLE_DEMO_LOGIN=true`. This puts the default demo credentials in the public frontend and gives anyone who knows them instructor access. Point that deployment at a separate, disposable demo Supabase project with no real or private data; never connect the shared demo account to a production dataset.

The local Supabase configuration disables public account sign-up. The test-instructor provisioning script obtains the local service-role key from the CLI in memory, verifies the endpoint is loopback, and never writes that key into `.env.local` or frontend variables.

## Verification

```sh
npm test
npm run lint
npm run build
npm run db:test
```

`npm run db:reset` reapplies migrations and clears local test data before recreating the demo instructor. Use it only when you are ready to reset local survey data.

## Features

- Instructor password login through Supabase Auth
- Local demo instructor shortcut for testers
- Survey drafts with multiple-choice and true/false questions
- Single-active-survey activation and close operations
- Student survey links, QR projection page, and anonymous responses
- Instructor response counts, choice percentages, and CSV export
- Per-browser duplicate-submission protection with a database uniqueness check
