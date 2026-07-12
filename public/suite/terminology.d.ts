/*
 * Type-only companion for the bundler-free UMD dictionary in terminology.js
 * (GLOBAL_SETTINGS_SPEC §5). Adds ZERO runtime — the static apps load the .js
 * via <script src>; the Next side imports it and reads these types. Co-located so
 * TS resolves `import SuiteTerminology from '@/public/suite/terminology'` to a
 * proper module (the UMD .js alone type-resolves to a non-module script).
 */
export interface SuiteTerminologyInstance {
  /** Resolve a term: override → mode dict → coach dict → fallback → key. Never blank. */
  t(key: string, fallback?: string): string
  /** Fill [data-term] textContent + [data-term-attr] attributes under an element. */
  apply(root?: unknown): void
  /** The normalized mode this instance is bound to ('coach' | 'trainer'). */
  mode: string
}

export interface SuiteTerminologyApi {
  DICT: { coach: Record<string, string>; trainer: Record<string, string> }
  KEYS: string[]
  create(mode: string, overrides?: Record<string, unknown> | null): SuiteTerminologyInstance
  t(key: string, fallback?: string): string
  install(mode: string, overrides?: Record<string, unknown> | null): SuiteTerminologyInstance
}

declare const SuiteTerminology: SuiteTerminologyApi
export default SuiteTerminology
