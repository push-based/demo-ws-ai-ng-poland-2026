// UI plumbing shared by every step, so the live-coded main.ts files only
// contain Prompt API code. Nothing in here talks to the model.

import './styles.css';
import { INBOX, type Message } from './inbox';
import { installSimulator } from './simulate';

export interface UI {
  selected: Message;
  onSelect(fn: (m: Message) => void): void;
  status(text: string, kind?: 'ok' | 'warn' | 'bad' | 'idle'): void;
  progress(fraction: number | null): void;
  loadButton: HTMLButtonElement;
  summarizeButton: HTMLButtonElement;
  stopButton: HTMLButtonElement;
  triageButton: HTMLButtonElement;
  summary: { clear(label?: string): void; append(chunk: string): void; set(text: string): void; done(): void; hide(): void };
  badges(id: string, items: { text: string; urgency?: string; fallback?: boolean; pending?: boolean }[]): void;
  meter(usage: number | undefined, window: number | undefined, task?: 'Summary' | 'Triage'): void;
  tokensOnDevice(n: number): void;
  log(line: string): void;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, html = '') => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (html) e.innerHTML = html;
  return e;
};

const CHECKPOINTS = [
  ['start', 'The inbox is ready. Open main.ts and follow the numbered STEP comments.'],
  ['availability', 'Step 1: check whether the browser and device can run the model.'],
  ['session', 'Step 2: load the model, then summarize several messages. Watch the context grow.'],
  ['streaming', 'Step 3: switch to streaming. Click Stop to cancel generation.'],
  ['classify', 'Step 4: click Triage all for category and urgency badges.'],
  ['production', 'Step 5: each message starts from the same base context. Compare repeated summaries with step 4. Try ?simulate=unavailable.'],
];

export function mountApp(): UI {
  const number = Number(location.pathname.match(/\/steps\/(\d)-/)?.[1] ?? 0);
  const [name, hint] = CHECKPOINTS[number] ?? CHECKPOINTS[0];
  const step = `Step ${number} · ${name}`;
  const simulated = installSimulator();
  document.title = `Local Inbox · ${step}`;
  const app = el('div', { class: 'app' });
  app.innerHTML = `
    <header class="top">
      <div class="brand"><h1>Local Inbox</h1><span class="step">${step}</span>${simulated ? '<span class="ribbon">SIMULATED MODEL</span>' : ''}</div>
      <span class="chip" id="status" data-kind="idle"><span class="dot"></span><span id="status-text">not checked</span></span>
      <div class="bar" id="dl" hidden><i></i></div>
      <button id="load" hidden>Load on-device model</button>
      <span class="stat" id="ctx" hidden><span id="context-label">Summary context</span> <span class="bar meter" id="meter"><i></i></span><span id="meter-text"></span></span>
      <span class="stat bill" id="bill" hidden>on-device tokens <span id="tok">0</span> · cloud bill <b>€0.00</b></span>
    </header>
    <p class="hint">${hint}</p>
    <div class="grid">
      <section class="panel">
        <div class="head"><span>Inbox · ${INBOX.length}</span><button class="ghost" id="triage" hidden>Triage all</button></div>
        <ul class="list" id="list"></ul>
      </section>
      <section class="panel">
        <div class="head"><span>Message</span><span id="where"></span></div>
        <div class="detail">
          <div><h2 id="subj"></h2><div class="meta" id="meta"></div></div>
          <div class="body" id="body"></div>
          <div class="actions"><button id="summarize" hidden>Summarize</button><button class="ghost" id="stop" hidden disabled>Stop</button></div>
          <div class="summary" id="summary" hidden><span class="label">Summary</span><span id="sumtext"></span></div>
        </div>
      </section>
    </div>
    <div class="log" id="log"></div>`;
  document.body.append(app);
  const $ = <T extends HTMLElement>(id: string) => app.querySelector<T>('#' + id)!;

  const list = $('list');
  let selected = INBOX[0];
  let selectFn: (m: Message) => void = () => {};
  const show = (m: Message) => {
    selected = m;
    ui.selected = m;
    $('subj').textContent = m.subject;
    $('meta').textContent = `${m.from} · ${m.received}`;
    $('body').textContent = m.body;
    list.querySelectorAll('li').forEach((li) => li.setAttribute('aria-selected', String(li.dataset.id === m.id)));
    selectFn(m);
  };
  for (const m of INBOX) {
    const li = el('li', { 'data-id': m.id });
    li.innerHTML = `<span class="from"></span><span class="time"></span><span class="subj"></span><span class="badges"></span>`;
    li.querySelector('.from')!.textContent = m.from;
    li.querySelector('.time')!.textContent = m.received;
    li.querySelector('.subj')!.textContent = m.subject;
    li.addEventListener('click', () => show(m));
    list.append(li);
  }

  const sum = $('summary');
  const sumtext = $('sumtext');
  let caret: HTMLElement | null = null;
  let tok = 0;
  const ui: UI = {
    selected,
    onSelect(fn) { selectFn = fn; },
    status(text, kind = 'idle') { $('status').dataset.kind = kind; $('status-text').textContent = text; },
    progress(f) {
      const bar = $('dl');
      bar.hidden = f === null;
      (bar.firstElementChild as HTMLElement).style.width = `${Math.round((f ?? 0) * 100)}%`;
    },
    loadButton: $('load'),
    summarizeButton: $('summarize'),
    stopButton: $('stop'),
    triageButton: $('triage'),
    summary: {
      clear(label = 'Summary') {
        caret?.remove();
        sum.hidden = false; sum.classList.add('live');
        sum.querySelector('.label')!.textContent = label;
        sumtext.textContent = '';
        caret = el('span', { class: 'caret' }); sumtext.after(caret);
      },
      append(chunk) { sumtext.textContent += chunk; },
      set(text) { sumtext.textContent = text; },
      done() { sum.classList.remove('live'); caret?.remove(); caret = null; },
      hide() {
        sum.hidden = true;
        sumtext.textContent = '';
        ui.summary.done();
      },
    },
    badges(id, items) {
      const box = list.querySelector(`li[data-id="${id}"] .badges`)!;
      box.replaceChildren(...items.map((b) => {
        const s = el('span', { class: 'badge' + (b.fallback ? ' fb' : '') + (b.pending ? ' pending' : '') });
        if (b.urgency) s.dataset.u = b.urgency;
        s.textContent = b.text;
        return s;
      }));
    },
    meter(usage, window, task = 'Summary') {
      if (usage === undefined || !window) return;
      $('ctx').hidden = false;
      $('context-label').textContent = `${task} context`;
      const f = usage / window;
      $('meter').classList.toggle('hot', f > 0.8);
      ($('meter').firstElementChild as HTMLElement).style.width = `${Math.min(100, f * 100)}%`;
      $('meter-text').textContent = `${usage} / ${window}`;
    },
    tokensOnDevice(n) { tok += n; $('bill').hidden = false; $('tok').textContent = String(tok); },
    log(line) {
      const d = el('div'); d.textContent = line;
      $('log').append(d); $('log').scrollTop = 1e9;
      console.log('[local-inbox]', line);
    },
  };
  $('where').textContent = simulated ? 'simulated' : 'runs on this device';
  show(selected);
  if (simulated) ui.log(`Simulated model installed (${simulated}). No real inference on this page.`);
  return ui;
}
