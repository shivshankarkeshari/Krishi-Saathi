# कृषि साथी — Krishi Saathi

A Hindi-first crop-loss assistance workflow for Bihar agriculture staff, with an assisted farmer interface that demonstrates the same case moving from a conversation into an officer's queue.

Built for the Kenpath Full Stack AI Engineer assignment. All seeded people, records, claims, and decisions are fictional. This is an independent prototype, not a government service.

## Run with Docker

Requirements: Docker Engine/Desktop with Compose v2. The default application does not require an AI key or model download.

```bash
docker compose up --build -d --wait app
```

Open **http://localhost:3000**. Local demo mode needs no credentials. It is intentionally bound to the host's loopback interface. Use only fictional data.

The container applies SQLite migrations before starting the built Worker. The `case-data` volume persists cases, evidence files, roles, and history across container restarts and rebuilds. The local npm preview uses a separate database from Docker.

Run tests against the running container:

```bash
docker compose run --rm tests
```

Inspect and stop:

```bash
docker compose logs --tail 40 app
docker compose down
```

`down` retains data. Avoid `down -v` unless you deliberately want to erase the demo volume. If port 3000 is occupied, run `PORT=3001 docker compose up -d app` and open that port.

## LM Studio: requested local model

With LM Studio serving `lfm3-omni-2b` on the host's port 1234:

```bash
docker compose -f compose.yaml -f compose.lmstudio.yaml up --build -d --wait app
```

Open **http://localhost:3000**. This override uses exactly these application settings:

```dotenv
OPENAI_MODEL=openai/lfm3-omni-2b
OPENAI_API_KEY=lm-studio
OPENAI_BASE_URL=http://host.docker.internal:1234/v1
```

The `openai/` prefix selects the compatible provider; LM Studio advertises and receives `lfm3-omni-2b` as its model identifier. The app calls `/chat/completions` with a JSON schema and validates the result before displaying it. Successful assistance is labelled `lm-studio:lfm3-omni-2b`. The override disables the Codex bridge and Ollama route for this run. It uses your existing LM Studio server and does not download another model or send requests to OpenAI's servers.

Run tests against this configuration:

```bash
docker compose -f compose.yaml -f compose.lmstudio.yaml run --rm tests
```

LM Studio must remain running and reachable from Docker. Invalid, truncated, or unavailable inference uses the explicitly labelled rules-based fallback. This integration currently sends text evidence only; the model's audio capabilities are not wired into the phone/WhatsApp simulators.

## Optional open-source AI in Docker

The Ollama override runs Qwen3 4B locally. The model is an optional download of approximately 2.5 GB; leave additional RAM available for inference. CPU inference can be slow, especially on laptops. Model quality on local dialects requires field evaluation.

```bash
docker compose -f compose.yaml -f compose.ollama.yaml up --build -d --wait app
```

The initialization service pulls `qwen3:4b` into a persistent model volume before the app starts. Open a case and click **इस चरण में सहायता लें**. Successful inference displays `ollama:qwen3:4b`; unavailability or invalid output explicitly displays a rules-based fallback.

First-time model download may outlast Compose's wait timeout. Check `docker compose -f compose.yaml -f compose.ollama.yaml logs --tail 20 model-init`, then run the same `up` command again. Use the same override flags when stopping the model services.

References: [Ollama chat API](https://docs.ollama.com/api/chat), [Qwen3 4B model and license](https://ollama.com/library/qwen3:4b).

## Optional requested Codex model

An optional **local-only** bridge supports the user's requested `openai/gpt-6.1-sol` model using an installed Codex CLI with its existing login:

```bash
CODEX_FORCE_AUTH_JSON=1 CODEX_MODEL=openai/gpt-6.1-sol npm run ai:codex
```

The bridge listens on `127.0.0.1:9191`. The CLI receives the bare model name `gpt-6.1-sol`; `openai/` is the provider prefix accepted by this adapter. `CODEX_FORCE_AUTH_JSON` is passed through as requested; the adapter relies on the CLI's existing authenticated session, not on that variable creating authentication. It does not read, copy, print, persist, or mount `auth.json` in the application or Docker image.

For the npm development app, add this to untracked `.dev.vars`:

```dotenv
LOCAL_DEMO=1
AI_BRIDGE_URL=http://127.0.0.1:9191
```

For Docker Desktop on this development machine:

```bash
docker compose -f compose.yaml -f compose.codex.yaml up -d --build --wait app
```

This uses `host.docker.internal` to reach the host bridge. On platforms where that cannot reach a loopback listener, prefer the Ollama integration; do not expose the bridge publicly. `AI_BRIDGE_TOKEN` can protect the adapter if configured consistently at both ends. Do not publish a CLI-authenticated bridge as a shared production API. Model access depends on the CLI account.

The bridge launches ephemeral, read-only, text-only CLI inference in a temporary empty directory; shell, apps/plugins, browser, and computer tools are disabled. It returns schema-constrained JSON and permits one request at a time with a timeout. Only minimized case evidence goes to the model. Names and phone numbers are omitted from structured context, although identifiers embedded in user-provided document text must still be removed before real-data use.

Official background: [Codex non-interactive mode](https://developers.openai.com/codex/noninteractive). A live structured Hindi inference with the requested model was exercised during development; see `VERIFICATION.md` for the final validation record.

## Run without Docker

Requires Node 24+ and npm. The supplied Sites/Vinext installer preserves the project runtime setup.

```bash
npm run install:ci
cp .env.example .dev.vars
npm run db:migrate
npm run dev
```

Open **http://127.0.0.1:5173**. Enable an optional model by editing `.dev.vars`. By default only explicitly labelled rules-based assistance runs. Never enable `LOCAL_DEMO=1` on a publicly exposed real-data deployment.

```bash
npm run typecheck
npm test
npm run test:integration   # requires the local server on port 5173
npm run build
```

Set `BASE_URL=http://localhost:3000` for integration tests against Docker. Integration tests add fictional records and preserve their history; they do not delete existing data.

## Application chatbot, voice and English UI

Select **आवेदन सहायक / Application assistant**. The assistant first asks for a reference such as `KS-DEMO-1041`. Every answer, including follow-ups, executes the read-only `get_application_details` server tool with a workspace-scoped lookup. A collapsible tool trace shows the reference and revision retrieved. The browser never supplies the case facts to the model. The assistant answers status, evidence, correction, field-verification and decision questions; unrelated questions are refused. Common factual answers come directly from the retrieved record, while scoped evidence questions can use the configured LM Studio model. The chatbot can register a new demo request only after read-back confirmation and consent. It cannot alter existing review decisions or confirm a government payment.

Choose **नया आवेदन दर्ज करें / Register a new application** in Application assistant, or type “register”. The assistant collects name, village, contact number, crop, area and request description one at a time. Review/listen to the summary and confirm consent before registering. The server executes `register_application`, then `get_application_details`; the request uses the same validation, idempotency and creation-history transaction as the assisted intake. The assistant remembers the returned reference for follow-up questions. This is still a demo request, not official government submission.

The top-bar **English / हिन्दी** button changes interface labels, questions, controls and chatbot language. The preference is stored on the device. Original names and evidence/staff notes are retained as recorded; a language switch never rewrites the application. A switch is also available in the case dialog.

Voice input now uses real browser `MediaRecorder` audio capture rather than browser speech recognition. Click **Record**, allow the microphone, speak, then **Stop**. Listen to the recorded clip, review/edit the transcript, and choose **Use this transcript** before sending. Audio upload is an alternative when a microphone is unavailable. Recording requires localhost or HTTPS; the browser/site must have microphone permission. Chrome/Safari recording formats are selected by capability. Recording stops at 60 seconds and 5 MB is the upload limit.

The default Compose setup starts an internal FastAPI/faster-whisper service (`speech`) with a multilingual `base` model, CPU INT8 inference, and a persistent `speech-models` cache. The first start downloads the model. Audio is processed locally and is not stored as case evidence or sent to LM Studio automatically. The transcript can contain mistakes: review names, numbers, units and local dialects before confirming. Hindi script prompting improves Devanagari output but does not guarantee recognition accuracy.

```bash
# Workflow + lookup/snapshot tests
docker compose -f compose.yaml -f compose.lmstudio.yaml run --rm tests
# Actual audio decoding/transcription, invalid-file and silence tests
docker compose -f compose.yaml -f compose.lmstudio.yaml exec app npm run test:voice
```

Read-aloud now calls local Piper (`hi_IN-pratham-medium` for Hindi; `en_US-lessac-medium` for English). Voices download into the persistent speech cache on first use. The audio player provides pause/play/seek and a direct Play fallback if the browser blocks autoplay. No browser-installed Hindi voice is required. Very long text is limited to its first 3,000 characters per playback request. Pressing Record stops any current read-aloud to avoid recording the assistant’s voice.

Voice engine: [OHF Piper](https://github.com/OHF-Voice/piper1-gpl), GPL-3.0. Voice model provenance/licenses: [Piper voice repository](https://huggingface.co/rhasspy/piper-voices). These are upstream dependencies downloaded for local use; consult the respective model cards before redistributing voices.

**Full history → View details shared at this step** expands the saved before/after details for that action. New events have immutable-through-the-app snapshots. Older events explicitly say a detailed snapshot was not captured; the UI does not substitute the current case as historical evidence. The additive database migration preserves earlier records.

## Try the complete demo

1. Select **किसान सेवा डेमो**. Choose WhatsApp, phone, or assisted desk. These are channel simulators; they send no external messages or calls.
2. Answer the guided questions or choose **पूरा उदाहरण भरें**. Read/listen to the summary, confirm consent, and create the demo request.
3. Click **अधिकारी की तरफ़ देखें**. The same case is now in the officer queue.
4. In the coordinator role, record evidence, confirm document review, enter reasons, and advance. At field verification, record observed area and a visit note.
5. Switch to the reviewer role, record scrutiny and any area discrepancy, and advance. Switch to decision officer, enter reasons, and approve/reject after the confirmation dialog.
6. Alternatively return the case for correction. The farmer status panel shows the reason; a helper can confirm corrected evidence and resubmit to the stage that returned it.
7. Open **पूरा इतिहास**. Every successful transition/upload increments the case revision and records actor, reason, and timestamp.
8. In the farmer demo request human help. A real local task appears in **वापस कॉल करें**. Mark it completed after the simulated conversation.

See [DEMO_WALKTHROUGH.md](DEMO_WALKTHROUGH.md).

## Problem and users

A farmer should not need to read long forms, own a smartphone, or independently upload records to ask for help. Field staff need a clear next action, accessible evidence, and a reliable account of who did what.

The proposed service therefore starts with assisted access: an authorized helper captures the farmer's words and documents. Ordinary calls and human callbacks are the intended inclusive channel; WhatsApp voice notes are an additional option. In the prototype, channel simulations demonstrate the whole journey without pretending to have a live business number.

Read-aloud uses local Piper Hindi/English voices and a visible browser audio player. Voice capture uses the microphone only after an explicit click, and local Whisper transcribes recordings in Docker. This is not a live telephony system or a validated dialect model. Typed/helper entry remains available.

## Workflow and research

`Document review → Field verification → Scrutiny → Human decision`

There is also a return/correction loop. Decisions require reasons; approved/rejected cases are closed to further mutation. A role can act only at the permitted stage. Role switching is explicitly a **demo simulation within a user's workspace**, not verified government staff membership or production RBAC.

The selected domain is Bihar crop-loss/input assistance. The official Bihar DBT portal describes verification and land/tenancy evidence, but warns that requirements differ by scheme. Historical 2025 instructions mention agriculture coordinator and sub-divisional routing. The linked 2026–27 notification could not be retrieved during research. Consequently this prototype does **not** encode unverified officer designations, statutory deadlines, eligibility thresholds, rates, or payments. Its four stages and seven-day internal target are demonstration choices.

Sources:

- [Bihar Agriculture DBT portal](https://dbtagriculture.bihar.gov.in/) — service entry, documents and scheme-specific verification.
- [2025 crop-input instructions](https://dbtagriculture.bihar.gov.in/Instructions/GuidelineofKrishiInput2025.pdf) — historical context, not current eligibility authority.
- [2026–27 instructions linked by the portal](https://dbtagriculture.bihar.gov.in/Instructions/Letter%20no.%205479%20dt.%2022.09.2026.pdf) — exact current rules remain a validation gate.
- [Kenpath Maharashtra agriculture governance](https://www.kenpath.io/en/projects/maha-governance-intelligence) — source-grounded officer assistance, spoken notes, human judgment; Kenpath's own description.
- [Kenpath Invest UP](https://www.kenpath.io/en/projects/invest-up) — understanding actual approval workflows and policies.

The product does not submit to Bihar's portal, authenticate citizens against government identity systems, send SMS/WhatsApp, make calls, establish statutory eligibility, or release money. An internal demo reference is deliberately separate from an official application reference.

## Where AI helps and why

| Stage | Assistance | Human responsibility |
| --- | --- | --- |
| Document review | Summarize provided evidence and identify missing information | Read original documents and verify scheme requirements |
| Field verification | Structure recorded observations and draft a report | Visit/verify as required and confirm measured facts |
| Scrutiny | Compare stated and observed area; prepare questions linked to supplied sources | Resolve discrepancies and record a supported recommendation |
| Decision | Draft a plain-Hindi explanation based on evidence | Edit reasons and explicitly decide |

The same schema supports Ollama and the optional local Codex adapter. Output is validated with Zod; invalid/failed inference falls back with an explicit label. Assistance stores provider, case revision, stage, time, and generated result separately from the decision history. A short cache limits accidental repeated requests.

Arithmetic, required fields, priority ordering, stage transitions, and permissions use deterministic code. AI is not given action tools or decision authority. An AI source label identifies supplied evidence, not proof that the underlying document is authentic. Users can inspect the evidence and source links. PDF/image OCR is not implemented; TXT content is readable by assistance, while PDF/image originals are downloadable for human inspection.

## Data and technical decisions

- **React + TypeScript/Vinext:** a single Hindi web interface and server API on a Worker-compatible runtime; responsive sidebar, bilingual case dialog, scoped application chatbot, farmer simulator, local voice input and human-help queue.
- **D1 / SQLite:** relational persistence with versioned Drizzle migrations. The same SQLite semantics work locally in Docker and via D1 bindings when hosted.
- **R2-compatible private storage:** files stay outside relational JSON. Downloads check workspace ownership and are attachments with no-store/nosniff headers.
- **Optimistic concurrency:** case updates compare revisions. The update and audit event execute in one database batch; simultaneous updates yield one success and a recoverable conflict.
- **Idempotent intake:** a unique workspace/request key prevents duplicate cases from retried submissions.
- **Workspace isolation:** hosted requests require Sites identity; every case/document query scopes to its workspace. The local-only bypass is explicit and defaults off in code.
- **CSRF protection:** mutation endpoints reject cross-origin browser requests.
- **Evidence provenance:** corrections append to earlier text; uploaded originals and actions are retained. Application audit history is append-only through the API, not cryptographically tamper-proof.
- **Privacy:** seed data is fictional; full Aadhaar and bank accounts are not collected. No credentials are bundled. Retention, verified staff membership, stronger abuse controls, real contact verification, and residency requirements must be agreed before a real pilot.

SQLite, R2 objects, and migrations live in the named Docker volume. Shared phone numbers are accepted as contacts and never used as unique farmer identity. The farmer status simulator can see only the current demo workspace and must not be exposed as production identity verification.

## Impact measurement

Do not claim unmeasured improvement. Establish a baseline with the pilot team, then compare similar cases on:

- intake completed without farmer typing or smartphone ownership;
- farmer understanding of the next step;
- correction cycles and repeated visits;
- review time and case age at each stage;
- callback completion and unmet help requests;
- officer corrections to AI drafts, unsupported claims, and source usefulness;
- speech performance across local accents, noise, and shared-phone situations;
- ongoing cost per completed case.

The hypothesis is that assisted intake reduces exclusion, early discrepancy checks reduce rework, and a clear queue makes handoffs accountable. These require farmer/staff observation and a measured pilot, not just a working demo.

## Production/channel roadmap

Start with one verified scheme, notified event, district, and department partner. Add official WhatsApp webhooks (signature validation, provider-message idempotency, consent and approved templates), then ordinary calls plus staffed callback handling. Store notification jobs and delivery states separately from case decisions. Integrate official submission/status only through an authorized API or documented operator handoff. Do not treat a sent notification as understood, or approval as payment.

Live accounts, business-number approvals, dialect validation, real field interviews, government integration, and payment access are outside this prototype.

## Submission status

The project source and Docker demo are local. A Sites project identity exists in `.openai/hosting.json`, but no deployment is claimed. Automated approval review blocked the hosted Git connection because it could export the private source. Publishing and an accessible GitHub repository remain pending explicit destination approval/access. No email has been sent.
