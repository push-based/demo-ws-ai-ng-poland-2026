// LOCAL INBOX WORKSHOP
// Keep this file open and complete STEP 1 through STEP 5 in order.
// Each step has instructions at the call site and a SOLUTION block below.
// To enable a SOLUTION block, remove its surrounding /* and */ lines.
// Checkpoints contain this same file with the completed steps uncommented.

import { mountApp } from '../../shared/ui';
import { CATEGORIES, INBOX, URGENCIES, type Message } from '../../shared/inbox';
import { fallbackClassify, fallbackSummary } from '../../shared/fallback';

const ui = mountApp();

// The options for availability() and create() must match.
const OPTIONS = {
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
} satisfies Parameters<typeof LanguageModel.availability>[0];

let summarizer: LanguageModel | null = null;
let classifier: LanguageModel | null = null;
let controller: AbortController | null = null;
let basicMode = false;

// UI scaffolding: the handlers and their error handling are already supplied.
// Follow only the numbered instructions inside them.
async function start() {
  // STEP 1: Uncomment the next line and enable SOLUTION 1.
  const availability = await checkModel();

  // STEP 2: Uncomment the next line to show the Load button; enable SOLUTION 2.
  if (availability !== 'unavailable') ui.loadButton.hidden = false;

  // STEP 5: Uncomment these lines and enable SOLUTION 5.
  // if (availability === 'unavailable') enterFallback();
  // if (availability === 'available') await loadModel();
}

ui.loadButton.addEventListener('click', async () => {
  ui.loadButton.disabled = true;
  try {
    // STEP 2: Uncomment the next line.
    await loadModel();
  } catch (error) {
    reportError(error);
    // STEP 5: Uncomment the next line to recover if session creation fails.
    // enterFallback();
  } finally {
    ui.progress(null);
    ui.loadButton.disabled = false;
  }
});

ui.summarizeButton.addEventListener('click', async () => {
  const message = ui.selected;
  ui.summarizeButton.disabled = true;
  ui.summary.clear();

  // STEP 3: Uncomment these lines and enable SOLUTION 3.
  // controller = new AbortController();
  // ui.stopButton.disabled = false;

  try {
    // STEP 2: Uncomment the next line for a complete answer.
    // STEP 3: Comment it out again and uncomment summarizeStreaming instead.
    await summarizeOnce(message);

    // STEP 3: Uncomment the next line for streaming.
    // STEP 5: Comment it out again and uncomment summarizeProduction instead.
    // await summarizeStreaming(message);

    // STEP 5: Uncomment the next line for isolation and fallback.
    // await summarizeProduction(message);
  } catch (error) {
    if ((error as Error).name === 'AbortError') ui.log('summary stopped');
    else reportError(error);
  } finally {
    ui.summary.done();
    ui.summarizeButton.disabled = false;
    ui.stopButton.disabled = true;
  }
});

ui.stopButton.addEventListener('click', () => {
  // STEP 3: Uncomment the next line to make Stop cancel generation.
  // controller?.abort();
});

ui.triageButton.addEventListener('click', async () => {
  ui.triageButton.disabled = true;
  try {
    for (const message of INBOX) {
      ui.badges(message.id, [{ text: '…', pending: true }]);

      // STEP 4: Uncomment the next line and enable SOLUTION 4.
      // STEP 5: Comment it out again and uncomment triageProduction instead.
      // await triageMessage(message);

      // STEP 5: Uncomment the next line for isolation and fallback.
      // await triageProduction(message);
    }
  } catch (error) {
    reportError(error);
  } finally {
    ui.triageButton.disabled = false;
  }
});

ui.onSelect(() => {
  ui.summary.hide();
  // STEP 3: Uncomment the next line to stop streaming when switching messages.
  // controller?.abort();
});

addEventListener('pagehide', () => {
  // STEP 5: Uncomment the next line to release model sessions on navigation.
  // cleanup();
});

function reportError(error: unknown) {
  ui.log(`error: ${(error as Error).message}`);
}

// SOLUTION 1: Feature detection and the four availability states.
async function checkModel(): Promise<Availability> {
  if (!('LanguageModel' in self)) {
    ui.status('Prompt API not in this browser', 'bad');
    ui.log('"LanguageModel" in self → false');
    return 'unavailable';
  }

  const availability = await LanguageModel.availability(OPTIONS);
  ui.log(`LanguageModel.availability(OPTIONS) → "${availability}"`);
  switch (availability) {
    case 'available':
      ui.status('model ready on this device', 'ok');
      break;
    case 'downloadable':
      ui.status('model needs a one-time download', 'warn');
      break;
    case 'downloading':
      ui.status('model is downloading…', 'warn');
      break;
    case 'unavailable':
      ui.status('not available on this device', 'bad');
      break;
  }
  return availability;
}

// SOLUTION 2: Load a session from a click, then ask for a complete answer.
const SUMMARY_PROMPT =
  'You summarize customer messages for a support agent. Answer with exactly one sentence of at most 25 words. ' +
  'Never repeat personal data such as addresses, phone numbers, e-mail addresses or tax numbers.';

// Watch this context grow as you reuse a session in steps 2–4.
function contextUsage(session: LanguageModel) {
  return session.contextUsage ?? session.inputUsage;
}

function showContext(session: LanguageModel, task: 'Summary' | 'Triage' = 'Summary') {
  ui.meter(contextUsage(session), session.contextWindow ?? session.inputQuota, task);
}

async function loadModel() {
  ui.loadButton.disabled = true; // also covers automatic startup in step 5
  ui.status('creating session…', 'warn');
  summarizer = await LanguageModel.create({
    ...OPTIONS,
    initialPrompts: [{ role: 'system', content: SUMMARY_PROMPT }],
    monitor(monitor) {
      monitor.addEventListener('downloadprogress', (event) => {
        ui.progress(event.loaded);
        ui.status(`downloading model ${Math.round(event.loaded * 100)}%`, 'warn');
        if (event.loaded === 1) ui.status('preparing model…', 'warn');
      });
    },
  });

  summarizer.addEventListener('contextoverflow', () => ui.log('summary context full: oldest turns were dropped; system prompt retained'));

  // STEP 4: Uncomment the next line to create the second, task-specific session.
  // classifier = await createClassifier();

  ui.progress(null);
  ui.loadButton.hidden = true;
  ui.summarizeButton.hidden = false;
  // STEP 3: Uncomment the next line to show Stop.
  // ui.stopButton.hidden = false;
  // STEP 4: Uncomment the next line to show Triage all.
  // ui.triageButton.hidden = false;
  ui.status('sessions ready · on device', 'ok');
  ui.log('LanguageModel.create() → session');

  showContext(summarizer);
}

async function summarizeOnce(message: Message) {
  const before = contextUsage(summarizer!);
  const started = performance.now();
  const answer = await summarizer!.prompt(message.body);
  ui.summary.set(answer);
  showContext(summarizer!);
  ui.log(`summary context: ${before} → ${contextUsage(summarizer!)}`);
  ui.log(`prompt() answered in ${Math.round(performance.now() - started)} ms`);
}

// SOLUTION 3: Stream the answer; the caller supplies the AbortController.
/*
async function summarizeStreaming(message: Message, session = summarizer!) {
  const before = contextUsage(session);
  const started = performance.now();
  let first = 0;
  const signal = controller!.signal;
  signal.throwIfAborted();
  const stream = session.promptStreaming(message.body, { signal });
  for await (const chunk of stream) {
    signal.throwIfAborted();
    if (!first) first = performance.now() - started;
    ui.summary.append(chunk); // chunks are deltas: append, don't replace
  }
  showContext(session);
  ui.log(`summary context: ${before} → ${contextUsage(session)}`);
  ui.log(`first words after ${Math.round(first)} ms, done after ${Math.round(performance.now() - started)} ms`);
}
*/

// SOLUTION 4: A separate classifier with a JSON Schema for reliable labels.
/*
const TRIAGE_PROMPT =
  'You triage customer messages for an online travel-gear shop. ' +
  'category: return (send back, broken item), billing (charges, refunds of payments, invoices), shipping (delivery, tracking), bug (app or website problems), praise (thanks, compliments). ' +
  'urgency: high if the customer lost money or has a deadline; low for praise or when they say it is not urgent; otherwise normal.';

const TRIAGE_SCHEMA = {
  type: 'object',
  properties: {
    category: { type: 'string', enum: CATEGORIES },
    urgency: { type: 'string', enum: URGENCIES },
  },
  required: ['category', 'urgency'],
  additionalProperties: false,
};

async function createClassifier() {
  const session = await LanguageModel.create({
    ...OPTIONS,
    initialPrompts: [{ role: 'system', content: TRIAGE_PROMPT }],
  });
  session.addEventListener('contextoverflow', () => ui.log('triage context full: oldest turns were dropped; system prompt retained'));
  return session;
}

async function classify(message: Message, session = classifier!) {
  const before = contextUsage(session);
  const started = performance.now();
  const raw = await session.prompt(message.body, { responseConstraint: TRIAGE_SCHEMA });
  showContext(session, 'Triage');
  ui.log(`triage ${message.id}: ${Math.round(performance.now() - started)} ms · context ${before} → ${contextUsage(session)}`);
  ui.log(`${message.from}: ${raw}`);
  return JSON.parse(raw) as { category: string; urgency: string };
}

async function triageMessage(message: Message) {
  const result = await classify(message);
  showBadges(message, result);
}
*/

// UI helper supplied for both the model labels and the fallback labels.
function showBadges(message: Message, result: { category: string; urgency: string }, fallback = false) {
  ui.badges(message.id, [
    { text: result.category, fallback },
    { text: result.urgency, urgency: result.urgency, fallback },
  ]);
}

// SOLUTION 5: Wrap the existing features; keep their implementations intact.
/*
const activeClones = new Set<LanguageModel>();

async function withClone<T>(parent: LanguageModel, run: (session: LanguageModel) => Promise<T>, signal?: AbortSignal): Promise<T> {
  const session = await parent.clone({ signal });
  activeClones.add(session);
  session.addEventListener('contextoverflow', () => ui.log('context full: the browser dropped the oldest turns'));
  const before = contextUsage(session) ?? 0;
  ui.log(`fresh clone: context starts at ${before}`);
  const task = parent === classifier ? 'Triage' : 'Summary';
  showContext(session, task);
  try {
    const result = await run(session);
    showContext(session, task);
    ui.tokensOnDevice(Math.max(0, (contextUsage(session) ?? before) - before));
    return result;
  } finally {
    if (activeClones.delete(session)) {
      session.destroy();
      ui.log(`clone destroyed; base context stays at ${contextUsage(parent)}`);
    }
  }
}

async function summarizeProduction(message: Message) {
  if (!basicMode) {
    try {
      await withClone(summarizer!, (session) => summarizeStreaming(message, session), controller!.signal);
      return;
    } catch (error) {
      controller!.signal.throwIfAborted();
      if ((error as Error).name === 'AbortError') throw error;
      if ((error as Error).name === 'QuotaExceededError') ui.log('message too long for the context window');
      else reportError(error);
    }
  }
  ui.log('summary → basic mode');
  ui.summary.clear('Summary · basic mode (no AI)');
  ui.summary.set(fallbackSummary(message.body));
}

async function triageProduction(message: Message) {
  if (!basicMode) {
    try {
      const result = await withClone(classifier!, (session) => classify(message, session));
      showBadges(message, result);
      return;
    } catch (error) {
      reportError(error);
    }
  }
  ui.log(`${message.from}: triage → keyword rules`);
  showBadges(message, fallbackClassify(message.body), true);
}

function cleanup() {
  controller?.abort();
  for (const session of activeClones) session.destroy();
  activeClones.clear();
  summarizer?.destroy();
  classifier?.destroy();
  summarizer = classifier = null;
}

function enterFallback() {
  cleanup();
  basicMode = true;
  ui.progress(null);
  ui.loadButton.hidden = true;
  ui.summarizeButton.hidden = ui.stopButton.hidden = ui.triageButton.hidden = false;
  ui.summarizeButton.disabled = ui.triageButton.disabled = false;
  ui.status('no on-device model · basic mode', 'bad');
}
*/

// Start only after all solution constants have been initialized.
start().catch((error) => {
  reportError(error);
  // STEP 5: Uncomment the next line to recover if the capability check fails.
  // enterFallback();
});
