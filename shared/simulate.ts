// SIMULATED MODEL — a stage safety net, not a model.
// Open any step with ?simulate to install a fake LanguageModel that answers
// with canned text for the sample inbox. Use it only if the real model refuses
// to cooperate on stage, and say so: the page shows a "simulated" ribbon.
//   ?simulate              → starts "downloadable", fakes a download, then works
//   ?simulate=available    → skips the download
//   ?simulate=unavailable  → behaves like an unsupported device (shows the fallback)

import { INBOX } from './inbox';
import { fallbackClassify, fallbackSummary } from './fallback';

const CANNED: Record<string, { summary: string; category: string; urgency: string }> = {
  m1: { summary: 'Anna wants to return a travel kit bought on May 28 because the toiletry-bag zip is broken.', category: 'return', urgency: 'normal' },
  m2: { summary: 'Jonas was charged €89.90 twice for one order and wants the duplicate refunded quickly.', category: 'billing', urgency: 'high' },
  m3: { summary: 'Priya’s backpack has shown “label created” for six days and she needs it before her Friday flight.', category: 'shipping', urgency: 'high' },
  m4: { summary: 'The Android app crashes when scanning the warranty QR code, so warranty registration fails.', category: 'bug', urgency: 'low' },
  m5: { summary: 'Sofia thanks the team: the packing cubes held up through three weeks of hostel travel.', category: 'praise', urgency: 'low' },
  m6: { summary: 'Tomasz needs the invoice for one order reissued with his company details by the end of the month.', category: 'billing', urgency: 'normal' },
  m7: { summary: 'Elena’s parcel is missing a rain cover, and she needs it before her walking holiday next Thursday.', category: 'shipping', urgency: 'high' },
  m8: { summary: 'Lucas received a larger daypack than ordered and wants a return label and an exchange for the smaller size.', category: 'return', urgency: 'normal' },
  m9: { summary: 'Amira’s confirmed €129 refund has not reached her card after twelve days, and she needs a traceable payment reference.', category: 'billing', urgency: 'high' },
  m10: { summary: 'Oscar cannot complete checkout because the website repeatedly loses his delivery address and sends him back from the payment page.', category: 'bug', urgency: 'low' },
  m11: { summary: 'Zofia thanks the team for an easy-to-fit replacement wheel that made her suitcase roll smoothly again.', category: 'praise', urgency: 'low' },
  m12: { summary: 'Daniel’s suitcase is marked delivered but cannot be found, and he needs it before his Friday flight.', category: 'shipping', urgency: 'high' },
  m13: { summary: 'Inês wants to exchange one packing cube whose seam started coming apart after a single use.', category: 'return', urgency: 'normal' },
  m14: { summary: 'Noah was charged after checkout failed but received no order confirmation, and wants the order confirmed or the payment refunded.', category: 'billing', urgency: 'high' },
  m15: { summary: 'Petra cannot register her cabin case warranty because the form rejects its serial number, although the case itself works.', category: 'bug', urgency: 'low' },
  m16: { summary: 'Alex praises the backpacks for keeping belongings dry and staying comfortable throughout a three-week train trip.', category: 'praise', urgency: 'low' },
  m17: { summary: 'Aino’s parcel has stopped moving at a sorting centre, and she needs the bag before a work trip on Tuesday.', category: 'shipping', urgency: 'high' },
  m18: { summary: 'Rafael wants to exchange an unopened duplicate travel kit received as a gift for packing cubes.', category: 'return', urgency: 'normal' },
  m19: { summary: 'Léa needs an invoice corrected because it contains another company’s details, with the replacement required before Friday.', category: 'billing', urgency: 'high' },
  m20: { summary: 'Samira reports that the app’s order history page becomes blank after the latest update, while other features still work.', category: 'bug', urgency: 'low' },
  m21: {"summary": "The zip on my new weekend bag broke during its first trip.", "category": "return", "urgency": "normal"},
  m22: {"summary": "My bank shows two completed payments for one set of packing cubes.", "category": "billing", "urgency": "high"},
  m23: {"summary": "Please change my delivery address before the parcel leaves your warehouse.", "category": "shipping", "urgency": "high"},
  m24: {"summary": "The voucher field on your mobile checkout page clears itself when I tap Apply.", "category": "bug", "urgency": "low"},
  m25: {"summary": "Thank you for recommending a cabin bag that fitted the airline measuring frame perfectly.", "category": "praise", "urgency": "low"},
  m26: {"summary": "The daypack I received is orange, although my order confirmation says navy.", "category": "return", "urgency": "normal"},
  m27: {"summary": "My gift card balance was deducted but my bank card was also charged the full price.", "category": "billing", "urgency": "high"},
  m28: {"summary": "The courier has missed two scheduled collections of my suitcase order.", "category": "shipping", "urgency": "high"},
  m29: {"summary": "The tracking link in my confirmation email opens an error page.", "category": "bug", "urgency": "low"},
  m30: {"summary": "Your compression bags made our camping gear much easier to organise.", "category": "praise", "urgency": "low"},
  m31: {"summary": "My travel kit arrived without the removable shoulder strap shown in the product description.", "category": "return", "urgency": "normal"},
  m32: {"summary": "Our invoice shows the wrong currency even though the card payment was correctly taken in euros.", "category": "billing", "urgency": "high"},
  m33: {"summary": "My parcel is waiting at customs for additional information.", "category": "shipping", "urgency": "normal"},
  m34: {"summary": "The product photos disappear when I change the colour of a cabin bag on the mobile website.", "category": "bug", "urgency": "low"},
  m35: {"summary": "Thank you for the clear guide to replacing the buckle on my backpack.", "category": "praise", "urgency": "low"},
  m36: {"summary": "One vacuum storage bag slowly fills with air after I seal it.", "category": "return", "urgency": "normal"},
  m37: {"summary": "My refund is €12 below the amount in your confirmation email.", "category": "billing", "urgency": "high"},
  m38: {"summary": "My parcel is at a delivery depot in Copenhagen instead of Aarhus.", "category": "shipping", "urgency": "high"},
  m39: {"summary": "Every new email sign-in code is rejected as expired as soon as it arrives.", "category": "bug", "urgency": "low"},
  m40: {"summary": "The travel kit washed beautifully and kept its shape after our holiday.", "category": "praise", "urgency": "low"},
  m41: {"summary": "The lock on my unused suitcase has jammed during setup.", "category": "return", "urgency": "normal"},
  m42: {"summary": "The invoice for my order appears to include tax twice.", "category": "billing", "urgency": "high"},
  m43: {"summary": "Could my parcel be redirected to the collection point at the station?", "category": "shipping", "urgency": "normal"},
  m44: {"summary": "Selecting the small daypack adds the large version to my basket.", "category": "bug", "urgency": "low"},
  m45: {"summary": "Thank you for sending the replacement handle so quickly.", "category": "praise", "urgency": "low"},
  m46: {"summary": "I would like to exchange an unused travel organiser for the smaller size.", "category": "return", "urgency": "normal"},
  m47: {"summary": "Please reissue my invoice with the correct company details.", "category": "billing", "urgency": "high"},
  m48: {"summary": "My order has been marked as processing for a week.", "category": "shipping", "urgency": "normal"},
  m49: {"summary": "My saved products disappear every time I sign out and back into the app.", "category": "bug", "urgency": "low"},
  m50: {"summary": "The shoulder straps on your daypack are very comfortable on long walks.", "category": "praise", "urgency": "low"},
  m51: {"summary": "The stitching beside the carry handle on my new holdall is opening.", "category": "return", "urgency": "normal"},
  m52: {"summary": "My bank card was charged after I cancelled the order before dispatch.", "category": "billing", "urgency": "high"},
  m53: {"summary": "My delivery box arrived open with a pouch missing from the order.", "category": "shipping", "urgency": "high"},
  m54: {"summary": "The warranty registration photo upload fails every time I submit it.", "category": "bug", "urgency": "low"},
  m55: {"summary": "Your insulated bottle kept our water cold through a full day of walking.", "category": "praise", "urgency": "low"},
  m56: {"summary": "The cabin case is larger than the dimensions listed on your product page.", "category": "return", "urgency": "normal"},
  m57: {"summary": "I need a payment receipt that was missing from my order confirmation.", "category": "billing", "urgency": "high"},
  m58: {"summary": "The courier could not find the delivery instructions I entered at checkout.", "category": "shipping", "urgency": "high"},
  m59: {"summary": "Changing the checkout currency makes the page stop responding.", "category": "bug", "urgency": "low"},
  m60: {"summary": "The clear labels and different colours on your organisers make packing much easier.", "category": "praise", "urgency": "low"},
};

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(t); reject(signal.reason ?? new DOMException('Aborted', 'AbortError')); }, { once: true });
  });
const tokens = (s: string) => Math.ceil(s.length / 4);
const textOf = (input: LanguageModelInput) => (typeof input === 'string' ? input : input.map((m) => m.content).join('\n'));

function answer(input: string, constraint?: object): string {
  const msg = INBOX.find((m) => input.includes(m.body.slice(0, 40)));
  const canned = msg ? CANNED[msg.id] : undefined;
  if (!constraint) return canned?.summary ?? fallbackSummary(input);
  const c = canned ?? fallbackClassify(input);
  const props = (constraint as { properties?: Record<string, unknown> }).properties ?? {};
  const out: Record<string, string> = {};
  if ('category' in props) out.category = c.category;
  if ('urgency' in props) out.urgency = c.urgency;
  if ((constraint as { enum?: string[] }).enum) return JSON.stringify(c.category);
  return JSON.stringify(out);
}

class FakeSession extends EventTarget implements LanguageModel {
  contextWindow = 6144;
  contextUsage = 0;
  #destroyed = false;
  constructor(initial: LanguageModelMessage[] = [], usage = 0) {
    super();
    this.contextUsage = usage || initial.reduce((n, m) => n + tokens(m.content), 0);
  }
  #use(s: string) {
    if (this.#destroyed) throw new DOMException('Session destroyed', 'InvalidStateError');
    this.contextUsage += tokens(s);
    if (this.contextUsage > this.contextWindow) {
      this.dispatchEvent(new Event('contextoverflow'));
      this.contextUsage = Math.round(this.contextWindow * 0.6);
    }
  }
  async prompt(input: LanguageModelInput, o: LanguageModelPromptOptions = {}) {
    const text = textOf(input);
    this.#use(text);
    await wait(500 + Math.random() * 400, o.signal);
    const out = answer(text, o.responseConstraint);
    this.#use(out);
    return out;
  }
  promptStreaming(input: LanguageModelInput, o: LanguageModelPromptOptions = {}) {
    const text = textOf(input);
    const self = this;
    return new ReadableStream<string>({
      async start(ctrl) {
        try {
          self.#use(text);
          await wait(350, o.signal);
          const words = answer(text, o.responseConstraint).split(/(?<= )/);
          for (const w of words) { await wait(55 + Math.random() * 45, o.signal); ctrl.enqueue(w); }
          self.#use(words.join(''));
          ctrl.close();
        } catch (e) { ctrl.error(e); }
      },
    }) as ReadableStream<string>;
  }
  async append(input: LanguageModelInput) { this.#use(textOf(input)); }
  async clone() { return new FakeSession([], this.contextUsage); }
  destroy() { this.#destroyed = true; }
}

export function installSimulator(): string | null {
  const mode = new URLSearchParams(location.search).get('simulate');
  if (mode === null) return null;
  // Each page load starts in the requested state so a demo is repeatable.
  let downloaded = mode === 'available';
  const Fake: LanguageModelStatic = {
    async availability() {
      if (mode === 'unavailable') return 'unavailable';
      return downloaded ? 'available' : 'downloadable';
    },
    async create(o: LanguageModelCreateOptions = {}) {
      if (mode === 'unavailable') throw new DOMException('Model not available on this device', 'NotSupportedError');
      if (!downloaded) {
        const monitor = new EventTarget() as CreateMonitor;
        o.monitor?.(monitor);
        for (let i = 0; i <= 20; i++) {
          await wait(120, o.signal);
          const e = new ProgressEvent('downloadprogress', { loaded: i / 20, total: 1 });
          monitor.dispatchEvent(e);
        }
        downloaded = true;
      }
      return new FakeSession(o.initialPrompts);
    },
  };
  (globalThis as unknown as { LanguageModel: LanguageModelStatic }).LanguageModel = Fake;
  return mode || 'downloadable';
}
