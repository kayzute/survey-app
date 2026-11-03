# Classroom Survey

A mobile-friendly classroom survey app built with React, TypeScript, Supabase PostgreSQL, and Cloudflare Pages. Instructors prepare questions and display a QR code; students answer without signing in.

## Requirements

- Node.js 22 or later
- A Supabase project (or the Supabase CLI and Docker Desktop for local database development)

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase project settings. The browser uses only the public anon key; never put a password or service-role key in a `VITE_` variable.
4. Apply the SQL files in `supabase/migrations/` to the project, or run `supabase start` and `supabase db reset` for a local instance.
5. Create the instructor account in Supabase Dashboard under **Authentication → Users**. Keep public sign-up disabled in the hosted project as well; the local Supabase configuration disables it by default.
6. Start the app with `npm run dev` and open the printed local URL.

### Test student links from another device

For a quick classroom-network test, connect the computer and phone/tablet to the same Wi-Fi, start the app with `npm run dev -- --host 0.0.0.0`, and open `http://<computer-LAN-IP>:5173/` on the computer. Use that same LAN-IP URL to reach the app on the other device; a QR code created while the instructor is using `localhost` or `127.0.0.1` points back to the phone itself and will not work. Find the computer's IPv4 address with `ipconfig` on Windows. If Windows Firewall prompts you, allow Node/Vite on the private network. Guest Wi-Fi or campus network isolation may block device-to-device access.

This is a development-only test. For access outside the local Wi-Fi, deploy the `dist/` build to Cloudflare Pages and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Pages build environment. Then activate a survey and use the public deployed URL/QR code. Never expose the Supabase secret/service-role key in the frontend.

The database transaction tests use pgTAP and run with `supabase test db` after starting the local stack. The student response RPC validates the active survey, every question and choice, required answers, and the anonymous browser token in one transaction. RLS prevents anonymous reads of response and answer rows.

## Verification

```sh
npm test
npm run lint
npm run build
```

Database workflow tests:

```sh
npm run db:start
npm run db:test
```

`npm run db:reset` reapplies migrations and clears the local Supabase database; use it only when you are ready to reset local test data.

## Features

- Instructor password login through Supabase Auth
- Survey drafts with multiple-choice and true/false questions
- Single-active-survey activation and close operations
- Public survey links, QR projection page, and anonymous student responses
- Instructor response counts, choice percentages, and CSV export
- Per-browser duplicate-submission protection with a database uniqueness check

## Deployment

Build with `npm run build` and publish the `dist/` directory as a Cloudflare Pages SPA. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Pages environment. The `public/_redirects` rule routes deep links such as `/s/:slug` back to the app.

