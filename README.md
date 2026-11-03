# Classroom Survey

A local-first classroom survey app built with React, TypeScript, and Supabase PostgreSQL. Instructors prepare questions and display a QR code; students answer without signing in.

## Requirements

- Node.js 22 or later
- Docker Desktop

## Local setup

1. Install dependencies with `npm install`.
2. Start Docker Desktop.
3. Run `npm run db:start`. This starts the local Supabase stack, writes its URL and public key to ignored `.env.local`, and provisions a local instructor account.
4. Run `npm run dev` and open `http://127.0.0.1:5173/`.

The top-right **Use demo instructor** button signs in to the local test account (`instructor@uconn.edu` / `123456`). Locally, it only appears in Vite development mode when both the app and Supabase URLs are loopback addresses. The account is created or reset by `npm run db:start` and `npm run db:reset`.

The Vite app binds to localhost, so student links and QR codes work only in this browser on this computer until productionization. Supabase runs in local Docker containers; by default, Docker may publish container ports on all host interfaces. See the Docker Desktop networking note below before using untrusted networks.

The Render Blueprint in `render.yaml` configures a static site, SPA route fallback, and `VITE_ENABLE_DEMO_LOGIN=true`. When creating the Render service, supply the URL and anon key for a separate, disposable demo Supabase project. Apply the migrations with the Supabase CLI, turn off public sign-ups, set the Supabase Auth site URL and redirect URL to the Render URL, and provision the instructor using `node scripts/setup-demo-instructor.mjs`. That script requires an ignored `.env.demo.local` file with the service-role key and the exact project ref as an explicit confirmation. The default demo credentials are embedded in the public frontend and give anyone instructor access, so never connect the shared demo account to a production dataset.

### Docker Desktop networking

Docker publishes ports to every host interface unless they are explicitly bound to loopback. On Windows, use Docker Desktop's loopback default binding setting (or the Docker Engine `default-network-opts` bridge `host_binding_ipv4` option), restart Docker Desktop, then restart Supabase and verify its ports are bound to `127.0.0.1`. This is a Docker-wide default for user-defined bridge networks; assess its effect on other container projects first. Do not rely on a custom Docker network option unless `docker inspect` confirms the host binding.

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
