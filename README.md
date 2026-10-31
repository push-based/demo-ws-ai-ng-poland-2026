# Local Inbox

Mini example for the AI Poland 2026 free workshop **“Run AI in the Browser, Not the Cloud”** (Mon 2 Nov 2026, 17:00 CET).

A support inbox with 60 fictional messages for an invented travel-gear shop. Click a message and Chrome’s built-in model streams a one-sentence summary; click **Triage all** and every message gets a category and an urgency badge. The customer data never leaves the laptop, and there is no token bill.

## Run it

```bash
npm install
npm run dev        # opens the checkpoint index on http://localhost:5173
```

`localhost` counts as a secure context, so the Prompt API works without HTTPS.

## Requirements (Chrome’s, not ours)

- Chrome desktop 148 or newer (Prompt API on the web). Windows 10/11, macOS 13+, Linux, or ChromeOS on Chromebook Plus. No mobile.
- At least 22 GB free on the drive with the Chrome profile (the model itself is much smaller; Chrome removes it again if free space drops under 10 GB).
- GPU with more than 4 GB VRAM, or CPU-only with 16 GB RAM and 4+ cores.
- Unmetered network for the one-time model download. After that it works offline.
- Check the model at `chrome://on-device-internals` (Model Status tab).

## Checkpoints

| Step | What it adds | API |
|---|---|---|
| 0 · start | The UI, no AI | – |
| 1 · availability | Feature detection, the four availability states | `'LanguageModel' in self`, `LanguageModel.availability(options)` |
| 2 · session | Session with a system prompt, download progress, user gesture, first answer, context meter | `LanguageModel.create({ initialPrompts, monitor })`, `prompt()`, `contextUsage` / `contextWindow` |
| 3 · streaming | Words appear as they are generated; Stop button | `promptStreaming()`, `AbortController` |
| 4 · classify | Reliable labels from a JSON Schema with enums; badges, not JSON | `prompt(text, { responseConstraint })` |
| 5 · production | Clone per message, overflow and quota errors, cleanup, fallback | `clone()`, `destroy()`, `contextoverflow` |

Each checkpoint is the same app in `steps/<n>/main.ts`, with the completed exercises activated. Function names, layout, comments and UI scaffolding stay the same. Future solutions are already present in commented blocks. The checkpoint name and hint are chosen by the shared UI from the URL.

## Follow the workshop

1. Open `steps/0-start/main.ts` in your editor and `/steps/0-start/` in the browser. Keep working in this file and page throughout the workshop.
2. Search for `STEP 1`. Follow its instructions at each call site, then find `SOLUTION 1` and remove the surrounding `/*` and `*/` lines. Save and check the browser.
3. Repeat for steps 2–5. Uncomment only the code lines identified by the instructions. When a step says to replace a call, comment out the previous call so only one implementation runs.
4. If you get stuck, compare with the next checkpoint or open its page to continue. Checkpoint N has steps 1 through N activated; later solutions remain commented out.

| Exercise | Changes to activate |
|---|---|
| 1 | `checkModel()` and its call in `start()` |
| 2 | The Load button, `loadModel()`, and `summarizeOnce()` |
| 3 | `summarizeStreaming()` **instead of** `summarizeOnce()`, plus the AbortController, Stop button and cancellation when switching messages |
| 4 | The classifier session, Triage button, and `triageMessage()` |
| 5 | `summarizeProduction()` and `triageProduction()` **instead of** the earlier calls, plus startup recovery and cleanup |

For example, the summary handler already shows the streaming exercise:

```ts
// STEP 2: Uncomment the next line for a complete answer.
// STEP 3: Comment it out again and uncomment summarizeStreaming instead.
await summarizeOnce(message);

// STEP 3: Uncomment the next line for streaming.
// STEP 5: Comment it out again and uncomment summarizeProduction instead.
// await summarizeStreaming(message);
```

You keep the session creation, availability check, UI handlers and logging you already know. Step 5 wraps the streaming and classification functions with production handling; it reuses their implementations.

Switching inbox messages always hides and clears the previous summary. From step 3 onward it also aborts a running stream.

To see why step 5 uses clones, summarize the same message three times in step 2 or 4. The context meter and `summary context: before → after` log grow because each request adds a turn to the reused session. Repeat in step 5: every request logs `fresh clone`, starts from the same system-prompt context, then destroys its clone. The base session stays unchanged. Triage has its own session and context, with the same before/after logging. The meter is labelled **Summary context** or **Triage context** to show which session it describes; it is not a lifetime token total.

For a longer comparison, click **Triage all** in step 4: all 60 messages reuse one classifier session. Each result logs its time and context usage. Run it again if the context has not filled yet; the actual limit and timings depend on the model and device. Compare with the same inbox in step 5, where each message uses a fresh clone. A longer batch makes context growth easier to observe, but does not guarantee overflow in one pass or a particular speedup.

When the context fills, Chrome normally removes the oldest prompt/response pairs and keeps the system prompt. The app logs `context full` when this happens. It continues processing rather than resetting the session. A new input that still cannot fit after old turns are removed fails with `QuotaExceededError`. The schema sent with each triage request also uses context. See [Chrome’s session management documentation](https://developer.chrome.com/docs/ai/prompt-api#session_management). Simulator timings are canned delays and do not measure real model performance.

Overflow can cause a sharp latency jump rather than a gradual slowdown. Chromium's current `HandleOverflow()` implementation recreates a session from the initial prompts and replays the retained history. Ordinary requests can extend the existing session; overflow adds the history replay. This is why step 4 can become much slower at the boundary and why step 5 avoids that accumulated history. The exact slowdown depends on the installed Chrome build, model and hardware. See [Chromium's overflow handling](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/chrome/browser/ai/ai_language_model.cc#1111).

Run `npm run check:steps` to verify that checkpoint source files differ only by commenting or uncommenting code and solution blocks. `npm run build` runs this check too, then typechecks and builds every checkpoint.

## Stage safety net: simulated mode

Append `?simulate` to any step URL to install a fake `LanguageModel` with canned answers for the sample inbox. The page shows a **SIMULATED MODEL** ribbon. Use it only if the real model refuses on stage, and say so.

- `?simulate` starts as “downloadable” and fakes a short download on every page load
- `?simulate=available` skips the download
- `?simulate=unavailable` behaves like an unsupported device, so step 5 shows the fallback

## Before going live (checklist)

1. On the presenting laptop, open `chrome://on-device-internals` and confirm the model is downloaded (do this the day before, not on stage).
2. Run step 1 and see `available`. Run step 5 once so the model is warm.
3. Close other GPU-heavy tabs; screen sharing plus inference on a laptop GPU is the usual cause of slow first tokens.
4. To show the download flow honestly, use `?simulate` (the real download is several GB and can take minutes).
5. Keep step 5 with `?simulate=unavailable` ready to show the fallback.

## Notes

- `availability()` and `create()` get the same `expectedInputs` / `expectedOutputs`. Languages for text in Chrome: English, Spanish, Japanese, and from Chrome 149 also German and French. Polish is not supported yet, which is why the sample inbox is in English.
- Chunks from `promptStreaming()` are deltas: append them.
- Older builds call the context properties `inputUsage` / `inputQuota`; the context helper reads both.
- Hybrid option: load the official `prompt-api-polyfill` (cloud or Transformers.js backend) only when `LanguageModel` is missing. Then the data no longer stays on the device, and the UI should say so.
