# Prompt Log

## 2026-10-29

### User prompt
> Before beginning, please read all files in context. Every prompt I provide please log it in an .md called prompts.md and record any notable interactions between you and me.
>
> Read the files and then report any uncertainties or clarifications you need. Then we can begin after I provide some more context.

### Notable interaction
- I read all five files in `context/`: `API.md`, `Classroom_Survey_Web_App_Specification.md`, `DATABASE.md`, `TODO.md`, and `UI.md`.
- I reported that I would record the prompt and interaction in this log, then wait for the user's additional context before making project changes.

## 2026-11-03

### User prompt
> The code hasn't been written. I want to create an implementation plan that follows the TODO. Can you clear the checkmarks and start implementing the code base. Please implement the database first which we will utilize Supabase PostgresSQL, then the backend, and finally the frontend. Follow the context files for each one accordingly. Commit regularly and push to the GitHub after testing and verifying each feature. Thoroughly test via unit testing and if applicable allow me to verify.
>
> Document any decisions I make that may be outside of the context files provided.
>
> Here are the specific requirements for this app:
>
> Your application must implement the following features -
>
> The instructor should be able to:
>
> - Log in using an instructor account.
> - Create a new survey.
> - Add multiple-choice and true/false questions.
> - Edit existing draft surveys.
> - View a list of surveys.
> - Activate a survey for students.
> - Close an active survey.
> - View survey results.
> - See response counts and percentages.
> - Export results as CSV.
>
> Only one survey should be active at a time.
>
> #### 4.2 Student Interface
>
> Students should be able to:
>
> - Access an active survey through a URL or QR code.
> - View the survey questions.
> - Select answers.
> - Submit their responses.
> - Receive confirmation after submitting.
>
> Students should **not** need to create an account or log in.
>
> The application should provide reasonable protection against accidental duplicate submissions.
>
> ####
>
> The instructor should be able to display a presentation page containing:
>
> - Survey title.
> - QR code linking to the active survey.
> - Survey URL.
> - Number of submitted responses.
>
> The presentation page should be suitable for classroom projection.
>
> Lastly, make sure the .gitignore does not expose any passwords, secrets, or service-role keys.

### Notable interaction
- I confirmed the application code has not been written and supplied implementation requirements and workflow constraints.
- I asked for npm registry access after the sandbox could not resolve the package registry; the dependencies then installed.
- I reported the database verification limitation: the Supabase CLI and `psql` are unavailable, and the installed Docker client cannot reach a running Docker engine.
- The UI can be built and tested locally, but the Codex in-app browser cannot reach the Windows loopback preview. The app currently has no Supabase project credentials configured.

### User decisions outside the supplied context documents
- Build in this order: Supabase PostgreSQL database, backend, then frontend.
- Reset all existing TODO completion checkmarks before implementation.
- Test and verify each feature before committing and pushing it to GitHub; perform thorough unit testing and offer user verification where useful.
- Keep passwords, secrets, and Supabase service-role keys out of Git through `.gitignore`.
- Start Docker Desktop so the local PostgreSQL migration and pgTAP workflow can be verified.

### User reply
> I’ll start Docker Desktop

### Notable interaction
- The expanded frontend tests now cover the dashboard’s search/status filters, draft activation navigation, and the survey editor save flow.
- The expanded frontend suite passed 16 unit/UI tests, and the TypeScript/Vite production build and ESLint passed before Docker became available.
- The user started Docker Desktop; I started the repository's local Supabase stack. Its migration applied, and all 24 pgTAP database checks now pass after correcting two test-fixture syntax/setup issues.

- Follow-up verification: the 16 frontend tests, production build, and lint passed again. Docker’s Linux engine is now unreachable in this session; prior pgTAP run passed 24 assertions. GitHub DNS lookup also failed during the initial remote check.

### Latest user prompt
> Okay, so now it will work locally and connects to the Supabase. When I opened the URL on my device to fill out a response, it said survey was unavailable. I also want to be able to test that this works on other devices so we will have to productionize this. Let's examine why the survey was unavailable and continue from there

### Notable interaction
- The project has a hosted Supabase URL configured, but the Vite dev script was bound to `127.0.0.1`; the presentation QR uses the browser's current origin. A loopback URL on a phone points to the phone, not the computer. The LAN test workflow is now documented and Vite is configured to bind on all interfaces for same-network tests.
- The hosted database's active-survey state could not yet be confirmed from this environment; the first Supabase REST check failed at network fetch.
- I asked which link was opened and for the exact unavailable error text; awaiting the user's reply while continuing the independent LAN access fix.

### User decision outside supplied context documents
- The user wants to verify student survey access on additional devices and prepare the app for production use.
- Follow-up confirmed: read-only request to the configured hosted Supabase project returned HTTP 200 and zero active surveys, so the project currently has no survey the public route can serve. The dev server now starts at `0.0.0.0`; its LAN URL `http://10.194.44.201:5173/` returned HTTP 200 from this computer.
- npm test (16 tests), build, and lint all pass after the LAN-binding and documentation changes.

### User clarification
> The link below the QR code

- The user opened the presentation page's printed URL rather than scanning the QR; this uses the exact same URL generated from the instructor page's browser origin.

### Latest user prompt
> Add question returns a blank screen so I can't test any further.

### Notable interaction
- The open browser URL was `/surveys/new` on the LAN HTTP origin. The editor created question keys with an unguarded `crypto.randomUUID()` call, which can be absent on a non-secure LAN HTTP origin. Added a fallback and a regression test simulating browsers without `randomUUID`.

- Confirmed in the live Vite error log: TypeError: crypto.randomUUID is not a function from 
ewQuestion() at the time the user clicked Add question. The fallback regression test passes; all 17 frontend tests, build, and lint pass. The running dev server has hot-reloaded the fix.

- Exact-slug checks against hosted Supabase: public resolver returned HTTP 200 and status ctive; questions and choices were also readable anonymously. Supabase CORS preflight from http://10.194.44.201:5173 returned HTTP 200 with wildcard origin. The same student URL displayed the survey form correctly in a new regular Google Chrome tab. The Codex in-app browser tab still shows Something went wrong, isolating the current discrepancy to that embedded browser/runtime rather than the survey record or database policy.

### User clarification
> This app is not going to be built for users. I actually want the button included in the deployed version once we move the app to Render to deploy.

### Recorded decision outside supplied context documents
- Keep the one-click demo instructor available for localhost testing and make it opt-in for a future Render demo deployment with `VITE_ENABLE_DEMO_LOGIN=true`. Because the demo credentials grant instructor access, a hosted demo must use a separate disposable Supabase project without real or private data.

### Latest notable interactions
- Switched ignored `.env.local` to local Supabase and changed Vite to bind only `127.0.0.1`; removed the Cloudflare Pages redirect and hosting instructions.
- Local Supabase's email/password Auth configuration needed a stop/start before it took effect. After restart, the demo account signed in successfully. pgTAP passed all 24 assertions.
- Added a local-only demo login button and explicit opt-in support for a future hosted demo build. Production build with the flag disabled omits the demo credentials.

### User clarification
> This app is not going to be built for users. I actually want the button included in the deployed version once we move the app to Render to deploy.

### Recorded decision outside supplied context documents
- Keep the demo instructor shortcut available in the future Render deployment as well as for local demos. Enable it for that build with `VITE_ENABLE_DEMO_LOGIN=true`; use a separate disposable Supabase project because the shared credentials will be public.

### User prompt
> What's left to implement now from the context files before we deploy to Render?

### Notable interaction
- I compared the TODO, API, database, UI, and app specification against the current implementation. The TODO's implementation checkboxes remain unchecked despite completed code, so they need an evidence-based update as features are verified. Core survey flows are in place; remaining pre-deployment work is concentrated in missing survey management/historical features, release setup, and end-to-end/device verification.

### User prompt
> Okay, let's implement the rest and check off the TODO boxes. Update them accordingly. Switch on the demo sign-in and establish the tests. Let's finish this out.
>
> Regarding the Docker Desktop, how should we approach this?

### Decisions and notable interactions
- Implemented dashboard archive/delete actions with confirmation, choice reordering, and survey creation-date filters. Added authenticated-only database RPCs and pgTAP coverage for archiving/deleting.
- Enabled the public demo sign-in in the Render Blueprint while keeping local env defaults off; added a guarded, ignored-file-based script to provision the demo instructor in a disposable hosted Supabase project.
- Added GitHub Actions for frontend checks, both demo-disabled and Render demo-enabled builds, and local Supabase pgTAP tests. Updated TODO checkboxes based on code and tests; manual cross-browser/device/accessibility and actual cloud deployment remain unchecked.
- Docker Desktop's published ports still bind to all interfaces on this Windows machine. Supabase CLI's project network is missing the network expected by pgTAP, so I attached the local database container to that test network without resetting its volume; 28 SQL tests then passed.
- Recommended managing localhost-only Docker access deliberately, verifying host bindings, and assessing Docker-wide default changes before applying them. The user asked for an approach; no Docker Desktop global settings were changed.
- Commit `d343c94` was pushed to `origin/main` after 30 frontend tests, lint, production build, and 28 pgTAP assertions passed. The demo provisioning migration was applied to local Supabase without resetting its data.

### User prompt
> We have the Supabase project already setup and it's connected via the URL and key. MVP wise we just need to test the CSV. Can we just step away from Docker Desktop now that Supabase is set up?

### User decision / notable interaction
- The hosted Supabase project is already created and configured; the remaining MVP verification requested is CSV export. The user wants to stop relying on Docker Desktop for normal app use.

### User prompt
> how do I unignore the .env.local? The links are already setup there.

### Notable interaction
- Clarified that `.env.local` being Git-ignored does not prevent Vite from reading it; checking only its configured URL host to confirm whether this checkout targets local or hosted Supabase.

### User prompt
> the variables I got from supabase are NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Should I just replace the values instead of the variable names

### Notable interaction
- Clarified that Supabase's `NEXT_PUBLIC_*` values need to be mapped to the Vite app's `VITE_*` variable names in local and Render configuration.

### User prompt
> okay now that it's switched and I'm testing in the chrome browser. There are a few issues I have noticed.
>
> - on the login page with Home INSTRUCTOR ACCESS is right next to it by a few pixels which is a UI issue.
> - we still need the demo login button to bypass for TA grading of this project
> - clicking the localhost qr code in a new tab does not allow me to submit a response

### Notable interaction
- Checked the current Chrome login page and confirmed the hosted Supabase URL was configured. The public survey QR route loaded the active Geography Check form in another Chrome tab. The user confirmed the submission flow test worked, so the localhost QR issue is resolved for same-computer testing; localhost remains limited to the current machine.
- Updated local development demo-login eligibility to permit hosted Supabase when the app itself runs on loopback. The Render Blueprint already enables demo login for the deployed grading demo.

### User reply
> The flow test worked

### Notable interaction
- User confirmed submission from the QR-linked form worked in the same-computer Chrome test.

### User prompt
> how come when I do it it says Survey unavailable now?

### Notable interaction
- Checking the current active public survey slugs in the hosted Supabase project to determine whether the link became inactive or unknown.

### User prompt
> I duplicated the survey: Copy of Geography Check. Here is the student link: http://localhost:5174/s/5b49a059210545eaa9
>
> Here are the results when I click it. Survey unavailable
> Something went wrong. Please try again.

### Notable interaction
- The user reports a generic student-route error for the duplicated survey's student link. Checking that exact slug through hosted Supabase's public resolver.

### User prompt
> Chrome console shows the React DevTools notice and two failed requests to resolve_public_survey returning HTTP 403.

### Notable interaction
- User supplied the browser console error; investigating Supabase authorization for the public survey RPC.

### Decision documented
- Public student survey lookup and submission RPCs now permit both anon and authenticated roles. This is needed because Supabase JS keeps the instructor session in browser storage and attaches its authenticated JWT to requests opened from that same browser; the SQL functions still validate survey state and answer ownership.

### User prompt
> Perfect all fixed! What's left?

### Notable interaction
- Reviewing the TODO checklist against completed implementation, test results, current Supabase configuration, and deployment notes.

### User prompt
> Update the TODO me to refer to Render. Check off any stale boxes that we have done. The migration workflow should be all set. Now I'm going to deploy this on render as everything else has been confirmed.

### Notable interaction
- Updated deployment checklist to use Render, marked pre-deployment functionality and checks as user-confirmed, and left Render deployment and production verification steps open.

### User prompt
> Where can I go to edit the migration workflow?

### Notable interaction
- Pointing the user to the repository migration files and the hosted Supabase workflow for applying schema changes.

### User prompt
> We should be all set then. Push everything to GitHub

### Notable interaction
- Reviewing all pending repository changes and secret-ignore rules before committing and pushing to GitHub.

### User prompt
> What should the settings on my render be? Any language or root directory or build/start commands?

### Notable interaction
- Looking up the checked-in Render Blueprint and current Render static-site settings to guide manual service setup.

### User prompt
> I have uploaded to the render site: https://survey-app-0z25.onrender.com/. All the functionality works except for scanning the QR code and deleting surveys

### Notable interaction
- Investigating production QR link construction and the authenticated delete RPC against the Render deployment.

### User prompt
> Deleting closed surveys shows: Something went wrong. Please try again.

### Notable interaction
- Inspecting the delete RPC, database permission migration, and dashboard refresh path to identify why production deletion is surfacing a generic error.

### User prompt
> The Render presentation URL is https://survey-app-0z25.onrender.com/surveys/762b77ed-378e-4ffa-aab2-d1a1fb9834f5/present and the student link is https://survey-app-0z25.onrender.com/s/5aa6d4de1bd54bbbba. Opening the QR code shows “Not found” on a black page.

### Notable interaction
- Comparing the production deep-link response, SPA fallback, and client-side routes to diagnose the QR destination.

### User prompt
> The rewrite rule worked. The delete request returns PGRST202: Supabase cannot find public.delete_survey(p_survey_id) in its schema cache.

### Notable interaction
- Confirmed the production delete RPC is absent from PostgREST's schema cache; locating its defining migration and preparing the hosted database repair step.

### User prompt
> Okay everything is done. We can cross off the rest of the TODO

### Notable interaction
- Marked Render deployment and production acceptance checks complete based on the user's confirmation; retained future enhancements as deferred ideas rather than completed work.
