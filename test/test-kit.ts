/**
 * Local test harness — builds a real RulesetContext for unit tests.
 *
 * Vendored from illusions `lib/linting/{base-rule,toolkit}`. These are small,
 * pure functions; keeping a copy here lets the template run tests without the
 * illusions source tree. When illusions publishes a testing entry
 * (`@illusions/lint-sdk/testing`), replace this file with an import of it.
 *
 * Behavior here mirrors what illusions injects at runtime, so a green test means
 * the rule will behave the same inside the app.
 */
import type {
  DetectorToolkit,
  DictLookup,
  GenjiHealthState,
  JsonRuleMeta,
  LintIssue,
  LintReference,
  LintRuleConfig,
  RegexReplaceOptions,
  RulesetBases,
  RulesetContext,
  RulesetManifest,
  RulesetRuleMeta,
  Severity,
  Token,
  UnitDetectorOptions,
  WordListMatch,
} from "illusions-lint-sdk";

// ---------------------------------------------------------------------------
// Minimal base classes (constructor + abstract lint) matching the SDK contract.
// ---------------------------------------------------------------------------

abstract class AbstractLintRule {
  abstract readonly id: string;
  abstract lint(text: string, config: LintRuleConfig): LintIssue[];
}

abstract class AbstractL1Rule extends AbstractLintRule {
  readonly meta: JsonRuleMeta;
  readonly id: string;
  readonly name: string;
  readonly nameJa: string;
  readonly description: string;
  readonly descriptionJa: string;
  readonly level = "L1" as const;
  readonly defaultConfig: LintRuleConfig;
  engine: "regex" | "morphological" = "regex";

  constructor(
    meta: JsonRuleMeta,
    config: {
      id: string;
      name: string;
      nameJa: string;
      description: string;
      descriptionJa: string;
      defaultConfig: LintRuleConfig;
    },
  ) {
    super();
    this.meta = meta;
    this.id = config.id;
    this.name = config.name;
    this.nameJa = config.nameJa;
    this.description = config.description;
    this.descriptionJa = config.descriptionJa;
    this.defaultConfig = config.defaultConfig;
  }

  abstract lint(text: string, config: LintRuleConfig): LintIssue[];
}

// Other base classes are stubbed; extend as needed for L2/document rules.
abstract class AbstractMorphologicalLintRule extends AbstractLintRule {
  abstract lintWithTokens(
    text: string,
    tokens: ReadonlyArray<Token>,
    config: LintRuleConfig,
  ): LintIssue[];
  lint(): LintIssue[] {
    return [];
  }
}
abstract class AbstractDocumentLintRule extends AbstractLintRule {
  abstract lintDocument(
    paragraphs: ReadonlyArray<{ text: string; index: number }>,
    config: LintRuleConfig,
  ): Array<{ paragraphIndex: number; issues: LintIssue[] }>;
  lint(): LintIssue[] {
    return [];
  }
}
abstract class AbstractMorphologicalDocumentLintRule extends AbstractLintRule {
  abstract lintDocumentWithTokens(
    paragraphs: ReadonlyArray<{ text: string; index: number; tokens: ReadonlyArray<Token> }>,
    config: LintRuleConfig,
  ): Array<{ paragraphIndex: number; issues: LintIssue[] }>;
  lint(): LintIssue[] {
    return [];
  }
}

const bases = {
  AbstractLintRule,
  AbstractL1Rule,
  AbstractMorphologicalLintRule,
  AbstractDocumentLintRule,
  AbstractMorphologicalDocumentLintRule,
} as unknown as RulesetBases;

// ---------------------------------------------------------------------------
// Toolkit (pure detectors).
// ---------------------------------------------------------------------------

function toGlobal(pattern: RegExp): RegExp {
  return pattern.flags.includes("g")
    ? new RegExp(pattern.source, pattern.flags)
    : new RegExp(pattern.source, `${pattern.flags}g`);
}

function regexReplace(opts: RegexReplaceOptions): LintIssue[] {
  const issues: LintIssue[] = [];
  const re = toGlobal(opts.pattern);
  let m: RegExpExecArray | null;
  while ((m = re.exec(opts.text)) !== null) {
    if (m[0].length === 0) {
      re.lastIndex += 1;
      continue;
    }
    const { from, to, original } = opts.span
      ? opts.span(m)
      : { from: m.index, to: m.index + m[0].length, original: m[0] };
    const replacement = opts.replacement(m);
    issues.push({
      ruleId: opts.ruleId,
      severity: opts.severity,
      message: opts.message,
      messageJa: opts.messageJa,
      from,
      to,
      originalText: original,
      ...(opts.reference ? { reference: opts.reference } : {}),
      fix: {
        label: opts.fixLabel ?? `Replace with ${replacement}`,
        labelJa: opts.fixLabelJa ?? `「${replacement}」に置換`,
        replacement,
      },
    });
  }
  return issues;
}

function detectUnits(opts: UnitDetectorOptions): LintIssue[] {
  const { text, ruleId, severity, units, reference, messageJa, dedup = true } = opts;
  const out: LintIssue[] = [];
  const seen = new Set<string>();
  for (const spec of units) {
    const re = toGlobal(spec.pattern);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex += 1;
        continue;
      }
      if (m[0] === spec.correct) continue;
      const from = m.index;
      const to = m.index + m[0].length;
      if (dedup) {
        const key = `${from}-${to}`;
        if (seen.has(key)) continue;
        seen.add(key);
      }
      out.push({
        ruleId,
        severity,
        message: `Incorrect unit notation: ${m[0]} -> ${spec.correct}`,
        messageJa: messageJa
          ? messageJa(m[0], spec.correct)
          : `単位表記「${m[0]}」は「${spec.correct}」と表記してください。`,
        from,
        to,
        originalText: m[0],
        ...(reference ? { reference: reference as LintReference } : {}),
        fix: { label: `Replace with ${spec.correct}`, labelJa: `「${spec.correct}」に置換`, replacement: spec.correct },
      });
    }
  }
  return out;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchWordList(text: string, words: ReadonlyArray<string>): WordListMatch[] {
  const ordered = [...new Set(words)].filter((w) => w.length > 0).sort((a, b) => b.length - a.length);
  const matches: WordListMatch[] = [];
  for (const word of ordered) {
    const re = new RegExp(escapeRegExp(word), "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      matches.push({ word, from: m.index, to: m.index + word.length });
    }
  }
  return matches.sort((a, b) => a.from - b.from || b.to - a.to);
}

function dedupe(issues: LintIssue[], key?: (issue: LintIssue) => string): LintIssue[] {
  const k = key ?? ((i: LintIssue) => [i.ruleId, `${i.from}-${i.to}`, i.fix?.replacement ?? ""].join("|"));
  const seen = new Set<string>();
  const out: LintIssue[] = [];
  for (const issue of issues) {
    const id = k(issue);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(issue);
  }
  return out;
}

function toJsonRuleMeta(rule: RulesetRuleMeta, manifest: RulesetManifest): JsonRuleMeta {
  return {
    ruleId: rule.ruleId,
    level: rule.level,
    description: rule.descriptionJa,
    patternLogic: "",
    positiveExample: rule.docs.positiveExample,
    negativeExample: rule.docs.negativeExample,
    sourceReference: rule.docs.sourceReference,
    bookTitle: manifest.nameJa,
  };
}

function makeDict(state: GenjiHealthState) {
  const ready = state === "ready";
  return {
    ready,
    state,
    async lookupBatch(): Promise<Map<string, DictLookup>> {
      return new Map();
    },
    async has(): Promise<boolean> {
      return false;
    },
  };
}

const toolkit: DetectorToolkit = {
  nfkc: (s: string) => s.normalize("NFKC"),
  charMap: (map) => (ch: string) => map.get(ch) ?? ch,
  applyCharMap: (map, input) => {
    let o = "";
    for (const ch of input) o += map.get(ch) ?? ch;
    return o;
  },
  regexReplace,
  detectUnits,
  matchWordList,
  dedupe,
  posFilter: (tokens, pred) => tokens.filter(pred),
  toJsonRuleMeta,
  dict: makeDict("ready"),
};

/** Build a test context. Pass a dict state to exercise requirement gating. */
export function createTestContext(dictState: GenjiHealthState = "ready"): RulesetContext {
  return {
    engineApi: 1,
    bases,
    toolkit: { ...toolkit, dict: makeDict(dictState) },
    deps: {
      requirements: new Map<string, boolean>([["dict:genji", dictState === "ready"]]),
      dictState,
    },
  };
}

export const CONFIG = { enabled: true, severity: "warning" as Severity };

// ---------------------------------------------------------------------------
// lintText — dispatches to lintWithTokens for L2 rules using hand-built tokens
// ---------------------------------------------------------------------------

/**
 * Convenience dispatcher that calls lint() for L1 rules.
 * For L2 (morphological) rules, it generates a minimal token sequence from the
 * text so golden tests can exercise lintWithTokens without a kuromoji runtime.
 *
 * The token generator covers the patterns needed for golden-example coverage of
 * gk-particle-wa-o-e and gk-iu.
 * Rule-specific L2 tests should pass their own hand-crafted token arrays to
 * lintWithTokens directly.
 */
export function lintText(
  rule: {
    level?: string;
    lint: (t: string, c: LintRuleConfig) => LintIssue[];
    lintWithTokens?: (t: string, tokens: ReadonlyArray<Token>, c: LintRuleConfig) => LintIssue[];
  },
  text: string,
  config: LintRuleConfig,
): LintIssue[] {
  if (rule.level === "L2" && typeof rule.lintWithTokens === "function") {
    return rule.lintWithTokens(text, simpleTokenize(text), config);
  }
  return rule.lint(text, config);
}

/**
 * Pre-built token sequences for the golden examples of L2 rules.
 * Only covers the specific sentences used in manifest.docs.
 * Extends as new L2 rules are added.
 */
function simpleTokenize(text: string): Token[] {
  // gk-particle-wa-o-e golden examples
  // Positive: 「彼女は東京へ向かった。」 — は and へ are correct
  if (text === "彼女は東京へ向かった。") {
    return [
      { surface: "彼女", pos: "名詞", pos_detail_1: "代名詞", start: 0, end: 2 },
      { surface: "は", pos: "助詞", pos_detail_1: "係助詞", start: 2, end: 3 },
      { surface: "東京", pos: "名詞", pos_detail_1: "固有名詞", start: 3, end: 5 },
      { surface: "へ", pos: "助詞", pos_detail_1: "格助詞", start: 5, end: 6 },
      { surface: "向かっ", pos: "動詞", basic_form: "向かう", start: 6, end: 9 },
      { surface: "た", pos: "助動詞", start: 9, end: 10 },
      { surface: "。", pos: "記号", start: 10, end: 11 },
    ];
  }
  // Negative: 「彼女わ東京え向かった。」 — わ(係助詞)→は, え(格助詞)→へ
  if (text === "彼女わ東京え向かった。") {
    return [
      { surface: "彼女", pos: "名詞", pos_detail_1: "代名詞", start: 0, end: 2 },
      { surface: "わ", pos: "助詞", pos_detail_1: "係助詞", start: 2, end: 3 },
      { surface: "東京", pos: "名詞", pos_detail_1: "固有名詞", start: 3, end: 5 },
      { surface: "え", pos: "助詞", pos_detail_1: "格助詞", start: 5, end: 6 },
      { surface: "向かっ", pos: "動詞", basic_form: "向かう", start: 6, end: 9 },
      { surface: "た", pos: "助動詞", start: 9, end: 10 },
      { surface: "。", pos: "記号", start: 10, end: 11 },
    ];
  }
  // gk-iu golden examples
  // Positive: 「先生がいったことを思い出した。」 — いった is correct
  if (text === "先生がいったことを思い出した。") {
    return [
      { surface: "先生", pos: "名詞", start: 0, end: 2 },
      { surface: "が", pos: "助詞", pos_detail_1: "格助詞", start: 2, end: 3 },
      { surface: "いっ", pos: "動詞", basic_form: "言う", start: 3, end: 5 },
      { surface: "た", pos: "助動詞", start: 5, end: 6 },
      { surface: "こと", pos: "名詞", pos_detail_1: "非自立", start: 6, end: 8 },
      { surface: "を", pos: "助詞", pos_detail_1: "格助詞", start: 8, end: 9 },
      { surface: "思い出し", pos: "動詞", basic_form: "思い出す", start: 9, end: 13 },
      { surface: "た", pos: "助動詞", start: 13, end: 14 },
      { surface: "。", pos: "記号", start: 14, end: 15 },
    ];
  }
  // Negative: 「先生がゆったことを思い出した。」 — ゆった(言う) → いった
  if (text === "先生がゆったことを思い出した。") {
    return [
      { surface: "先生", pos: "名詞", start: 0, end: 2 },
      { surface: "が", pos: "助詞", pos_detail_1: "格助詞", start: 2, end: 3 },
      { surface: "ゆっ", pos: "動詞", basic_form: "言う", start: 3, end: 5 },
      { surface: "た", pos: "助動詞", start: 5, end: 6 },
      { surface: "こと", pos: "名詞", pos_detail_1: "非自立", start: 6, end: 8 },
      { surface: "を", pos: "助詞", pos_detail_1: "格助詞", start: 8, end: 9 },
      { surface: "思い出し", pos: "動詞", basic_form: "思い出す", start: 9, end: 13 },
      { surface: "た", pos: "助動詞", start: 13, end: 14 },
      { surface: "。", pos: "記号", start: 14, end: 15 },
    ];
  }
  // Fallback: single-token whole-text (not useful for L2 detection, but prevents crash)
  return [{ surface: text, pos: "名詞", start: 0, end: text.length }];
}
