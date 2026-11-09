# Five-minute review

Open http://localhost:3000 after `docker compose up --build -d --wait app`.

1. **Dashboard:** six fictional sample cases begin at different stages. The first-priority card filters urgent pending cases; targets are internal demo targets. Seeded cases explicitly have no invented history for prior stages.
2. **Farmer journey:** select किसान सेवा डेमो → पूरा उदाहरण भरें → confirm the read-back and consent → create. The confirmation contains a demo reference.
3. **Officer journey:** click अधिकारी की तरफ़ देखें. Enter/read evidence and tick the original-evidence check. Write a reason and advance. In field verification enter the observed area and note, then advance.
4. **AI:** click इस चरण में सहायता लें. It displays its actual provider. With no configured model it says नियम-आधारित · लाइव AI नहीं. The assistant does not include unsaved edits; generate after committing stage observations. A draft can be copied to the reason box and edited.
5. **Correction:** as reviewer return the case with a clear reason. Close it, open its farmer status, enter corrected evidence, confirm/resubmit, and verify it returns to scrutiny with the earlier evidence intact.
6. **Final call:** switch to reviewer, record review and advance; switch to decision officer, write reasons, choose approve/reject, and confirm. The decision is explicitly a demo outcome.
7. **History:** open पूरा इतिहास. Compare it with the farmer's status panel: both read the same stored case.
8. **Human support:** request a callback in the farmer demo; see the resulting task in वापस कॉल करें. This records a task; no call is made.
9. **Evidence:** attach a fictional TXT/PDF/image in coordinator role. Download it again. TXT is included in assistance context; PDF/image OCR is not available.
10. **Persistence:** restart Docker without deleting its volume. Cases and evidence remain available.

Expected failures worth trying: move a review case in coordinator role; submit without a reason; send a field case without an observed area; edit a closed decision. The server rejects these actions.

The phone/WhatsApp tabs are labelled channel simulators. Read-aloud and speech recognition require suitable browser support; microphone use is optional, and browser speech processing may happen remotely.

## Application-only Q&A

Choose आवेदन सहायक. Enter `KS-DEMO-1041`, then ask about status, evidence or the last action. Expand the retrieval trace to see `get_application_details` and the retrieved case revision. An unrelated question receives a scoped refusal. No application changes are available through chat.

## Recording and language

Use the top-bar English/हिन्दी switch. In chat or farmer intake, click Record, grant microphone permission, speak, and Stop. Play the clip, review/edit the transcript, then Use this transcript and send it. You can upload an audio file instead. Audio is transcribed by local Whisper; allow time for the first model download. The app does not automatically record anyone or submit unconfirmed transcripts.

## Step details

Create/process a new request, open Full history and expand View details shared at this step. Inspect the saved values before and after that action. Older events without snapshots show an explicit unavailable-details message.

## Register from Application assistant

Choose Register a new application, answer the six questions or use the sample, listen to/review the read-back, tick consent and confirm. Expand the tool trace: `register_application` is followed by `get_application_details`. Ask “What is the status?” in the same chat; the reference is remembered.

## Hindi read-aloud

Click Listen to reply/question/status. A local Piper voice produces a WAV clip in the visible audio player. The first request downloads the voice. If autoplay is blocked, press Play on the player. This path does not require a Hindi voice installed in the browser.
