# Verification record

Development checks on 9 November 2026. Fictional data only.

| Check | Result |
| --- | --- |
| TypeScript `npm run typecheck` | Passed |
| Unit/domain, provider adapter, history, chatbot, registration and migration tests | 16 passed |
| Local development build | Passed; Worker and client bundles generated |
| Docker image build on Apple Silicon / Linux ARM64 runtime | Passed |
| Docker startup migrations and health check | Passed |
| Local API integration journey | Passed |
| Docker API integration journey | Passed |
| Intake consent and retry idempotency | Passed |
| Cross-origin write rejection | Passed |
| Wrong-role and invalid-stage actions | Passed |
| Concurrent edits | One success and one 409 conflict |
| TXT evidence upload/download and audit increment | Passed |
| Return, correction, and resubmission | Passed; prior evidence retained |
| Final human decision and closed-case protection | Passed |
| Callback creation and completion | Passed |
| Case/event count and unique revisions | Passed |
| Docker case persistence across rebuild/recreate | Passed; prior case retained |
| Requested Codex model, direct local bridge | Passed; structured Hindi output |
| Requested Codex model through Docker app `/api/assist` | Passed; provider `codex:gpt-6.1-sol` |
| Requested LM Studio model through Docker app `/api/assist` | Passed; provider `lm-studio:lfm3-omni-2b`, structured Hindi output |
| LM Studio endpoint and model discovery from Docker | Passed; `host.docker.internal:1234/v1`, advertised ID `lfm3-omni-2b` |
| Docker image credential isolation | No Codex auth directory mounted |
| Base, Ollama, Codex, and LM Studio Compose configuration | Validated |
| Optional Ollama model inference | Not executed; uses documented chat API/schema integration |
| Browser visual/interaction QA | Unverified: computer-use browser host unavailable |
| Actual English audio transcription through Docker API | Passed with public Whisper test recording |
| Synthetic Hindi transcription | Tested; Devanagari prompting added; transcript review is necessary |
| Browser microphone permission/capture behavior | Not captured automatically; requires user microphone permission and browser check |
| Chatbot reference-first lookup, current revision and unrelated-question refusal | Passed |
| Chat registration confirmation, consent, shared case store and idempotent retry | Passed |
| Hindi and English local Piper read-aloud API | Passed; WAV clips generated via the app |
| Chatbot workspace isolation | Passed; other workspace cannot look up the reference |
| History snapshot before/after values and legacy fallback | Passed |
| English/Hindi static-label and dynamic priority translation | Passed |
| Live phone/WhatsApp delivery | Not implemented; explicitly labelled simulators |
| Government integration / real eligibility / payment | Not implemented |
| Hosted Git upload / deployment | Blocked by automatic approval review; not attempted through another route |

The integration suite creates a fictional case and exercises the actual running API, SQLite/D1 store, and private R2-compatible local storage. It preserves test records rather than deleting existing data. Seed examples explain that history before their seeded stage is unavailable.

A Docker startup configuration defect (runtime variables must be available beside the generated Wrangler config) was found by integration tests and fixed before the passing run.

Neither HTML response checks nor passing API tests establish browser layout/accessibility correctness. Visual, keyboard, microphone, and read-aloud checks remain for an available browser session.

Voice capture was changed from unsupported browser SpeechRecognition to MediaRecorder plus local Whisper. A real audio test found a PyAV 19 / faster-whisper incompatibility; PyAV was pinned to 16.0.1 and the pipeline retested. The browser automation host remained unavailable, and native browser inventory was unusually slow, so full browser interaction QA remains unverified.

The assistant now offers confirmed guided registration through the shared register_application service, followed by a current-record lookup. Hindi read-aloud was moved from browser speechSynthesis to local Piper voice generation with explicit audio controls and autoplay fallback. Both Hindi and English WAV responses were exercised through the running Docker app. Browser microphone and audible playback on the user device still require a browser check; no live microphone was recorded automatically.
