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
