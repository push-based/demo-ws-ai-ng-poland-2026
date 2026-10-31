// The no-AI path. When the built-in model isn't available (Safari, Firefox,
// mobile, a laptop without enough VRAM or disk) the feature degrades instead of
// disappearing: a plain extractive "summary" and keyword rules for triage.
// Worse than the model, clearly labelled, and still private and free.

import type { Category, Urgency } from './inbox';

const GREETING = /^(hi|hello|hey|good (morning|afternoon|evening)|dear)[^.!?\n]*[,!.]?\s*/i;

export function fallbackSummary(text: string): string {
  const body = text.replace(GREETING, '').trim();
  const first = body.split(/(?<=[.!?])\s+/)[0] ?? body;
  return first.length > 160 ? first.slice(0, 157).trimEnd() + '…' : first;
}

const RULES: [Category, RegExp][] = [
  ['billing', /\b(charged?|refund the|invoice|payment|credit card|vat|nip)\b/i],
  ['return', /\b(return|send it back|broken|defect|exchange)\b/i],
  ['shipping', /\b(tracking|shipped|delivery|parcel|arrive)\b/i],
  ['bug', /\b(app|crash(es)?|error|doesn't work|bug)\b/i],
  ['praise', /\b(thank|love|best|great)\b/i],
];

export function fallbackClassify(text: string): { category: Category; urgency: Urgency } {
  const category = RULES.find(([, re]) => re.test(text))?.[0] ?? 'praise';
  const urgency: Urgency = /\bnot urgent\b/i.test(text) || category === 'praise'
    ? 'low'
    : /\b(asap|as soon as possible|urgent|friday|rent|twice)\b/i.test(text)
      ? 'high'
      : 'normal';
  return { category, urgency };
}
