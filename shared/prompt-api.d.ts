// Minimal typings for Chrome's built-in Prompt API (LanguageModel).
// Web: stable since Chrome 148. Spec: https://github.com/webmachinelearning/prompt-api
// Only the parts this workshop uses. Older Chrome builds named the context
// properties inputQuota / inputUsage; we read both in shared/meter.ts.

type Availability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

interface LanguageModelExpected {
  type: 'text' | 'image' | 'audio';
  languages?: string[];
}

interface LanguageModelMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  prefix?: boolean;
}

interface CreateMonitor extends EventTarget {
  addEventListener(
    type: 'downloadprogress',
    listener: (e: ProgressEvent) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void;
}

interface LanguageModelCreateOptions {
  initialPrompts?: LanguageModelMessage[];
  expectedInputs?: LanguageModelExpected[];
  expectedOutputs?: LanguageModelExpected[];
  monitor?: (m: CreateMonitor) => void;
  signal?: AbortSignal;
}

interface LanguageModelPromptOptions {
  responseConstraint?: object;
  omitResponseConstraintInput?: boolean;
  signal?: AbortSignal;
}

type LanguageModelInput = string | LanguageModelMessage[];

interface LanguageModel extends EventTarget {
  prompt(input: LanguageModelInput, options?: LanguageModelPromptOptions): Promise<string>;
  promptStreaming(input: LanguageModelInput, options?: LanguageModelPromptOptions): ReadableStream<string>;
  append(input: LanguageModelInput, options?: { signal?: AbortSignal }): Promise<void>;
  clone(options?: { signal?: AbortSignal }): Promise<LanguageModel>;
  destroy(): void;
  readonly contextUsage?: number;
  readonly contextWindow?: number;
  /** Pre-2026 names, still seen on older builds. */
  readonly inputUsage?: number;
  readonly inputQuota?: number;
}

interface LanguageModelStatic {
  availability(options?: Omit<LanguageModelCreateOptions, 'monitor' | 'signal' | 'initialPrompts'>): Promise<Availability>;
  create(options?: LanguageModelCreateOptions): Promise<LanguageModel>;
}

declare var LanguageModel: LanguageModelStatic;

interface ReadableStream<R> {
  [Symbol.asyncIterator](): AsyncIterableIterator<R>;
}
