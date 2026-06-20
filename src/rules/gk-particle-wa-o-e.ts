/**
 * gk-particle-wa-o-e — 助詞「は」「を」「へ」の正書法
 *
 * 現代仮名遣い（昭和61年内閣告示第1号）本文 第2の1 は、助詞「は」「を」「へ」を
 * それぞれ「は」「を」「へ」と書くと定める。
 * 「わ」「お」「え」と書くことは誤りである。
 *
 * 本ルールは形態素解析トークンを利用して、助詞として機能する「わ」「お」「え」を
 * 検出し、「は」「を」「へ」への修正を提案する。
 *
 * 偽陽性回避:
 *   - POS が「助詞」のトークンのみ対象とする。
 *   - お→を: 格助詞として使われる「お」は「を」の誤記であり安全に検出できる。
 *   - え→へ: 格助詞として使われる「え」は「へ」の誤記であり安全に検出できる。
 *   - わ→は: 女性語的な文末の「わ」（終助詞）は正しい日本語であるため検出しない。
 *     係助詞・副助詞としての「わ」のみ「は」の誤記として検出する。
 *     （例: 「そうだわ」「いいわ」→ 終助詞 = 正しい。
 *           「わたしわ行く」→ 係助詞 = 「は」の誤記として検出。）
 *
 * 偽陽性が多い可能性があるため severity は "info" とする。
 *
 * 出典: 現代仮名遣い（昭和61年内閣告示第1号）本文 第2の1
 */
import type {
  LintIssue,
  LintRule,
  LintRuleConfig,
  RulesetContext,
  RulesetManifest,
  Token,
} from "illusions-lint-sdk";

const REFERENCE = {
  standard: "現代仮名遣い（昭和61年内閣告示第1号）",
  section: "本文 第2の1",
} as const;

/** 「わ」を「は」の誤記として安全に検出できる pos_detail_1 値。終助詞は含めない。 */
const WA_SAFE_POS_DETAIL: ReadonlySet<string> = new Set([
  "係助詞",
  "副助詞",
  "副助詞／並立助詞／終助詞", // kuromoji がこの分類を返す場合への対応
]);

/** 格助詞「お」が「を」の誤記になりうるかを判定する pos_detail_1 値 */
const O_SAFE_POS_DETAIL: ReadonlySet<string> = new Set(["格助詞", "係助詞", "副助詞"]);

/** 格助詞「え」が「へ」の誤記になりうるかを判定する pos_detail_1 値 */
const E_SAFE_POS_DETAIL: ReadonlySet<string> = new Set(["格助詞"]);

interface Detection {
  surface: string;
  correct: string;
  check: (t: Token) => boolean;
  messageJa: (surface: string, correct: string) => string;
  fixLabelJa: (correct: string) => string;
}

const DETECTIONS: ReadonlyArray<Detection> = [
  {
    surface: "わ",
    correct: "は",
    check: (t: Token) =>
      t.pos === "助詞" && t.surface === "わ" && WA_SAFE_POS_DETAIL.has(t.pos_detail_1 ?? ""),
    messageJa: (_s, c) =>
      `現代仮名遣い（昭和61年内閣告示第1号）に基づき、助詞は「${c}」と書きます（第2の1）。`,
    fixLabelJa: (c) => `「${c}」に修正`,
  },
  {
    surface: "お",
    correct: "を",
    check: (t: Token) =>
      t.pos === "助詞" && t.surface === "お" && O_SAFE_POS_DETAIL.has(t.pos_detail_1 ?? ""),
    messageJa: (_s, c) =>
      `現代仮名遣い（昭和61年内閣告示第1号）に基づき、助詞は「${c}」と書きます（第2の1）。`,
    fixLabelJa: (c) => `「${c}」に修正`,
  },
  {
    surface: "え",
    correct: "へ",
    check: (t: Token) =>
      t.pos === "助詞" && t.surface === "え" && E_SAFE_POS_DETAIL.has(t.pos_detail_1 ?? ""),
    messageJa: (_s, c) =>
      `現代仮名遣い（昭和61年内閣告示第1号）に基づき、助詞は「${c}」と書きます（第2の1）。`,
    fixLabelJa: (c) => `「${c}」に修正`,
  },
];

export function createGkParticleWaOE(ctx: RulesetContext, manifest: RulesetManifest): LintRule {
  const metaEntry = manifest.rules.find((r) => r.ruleId === "gk-particle-wa-o-e");
  if (!metaEntry) throw new Error("manifest is missing the gk-particle-wa-o-e rule");

  const { AbstractMorphologicalLintRule } = ctx.bases;
  const { toolkit } = ctx;

  const ruleId: string = metaEntry.ruleId;
  const nameJa: string = metaEntry.nameJa;
  const descriptionJa: string = metaEntry.descriptionJa;
  const defaultConfig = metaEntry.defaultConfig;
  const ruleMeta = toolkit.toJsonRuleMeta(metaEntry, manifest);

  class GkParticleWaOE extends AbstractMorphologicalLintRule {
    readonly id = ruleId;
    readonly name = nameJa;
    readonly nameJa = nameJa;
    readonly description = descriptionJa;
    readonly descriptionJa = descriptionJa;
    readonly level = "L2" as const;
    readonly defaultConfig = defaultConfig;
    readonly engine = "morphological" as const;
    readonly meta = ruleMeta;

    lint(_text: string, _config: LintRuleConfig): LintIssue[] {
      return [];
    }

    lintWithTokens(
      _text: string,
      tokens: ReadonlyArray<Token>,
      config: LintRuleConfig,
    ): LintIssue[] {
      if (!config.enabled) return [];
      const issues: LintIssue[] = [];

      for (const token of tokens) {
        for (const det of DETECTIONS) {
          if (!det.check(token)) continue;
          issues.push({
            ruleId: this.id,
            severity: config.severity,
            message: `Particle "${token.surface}" should be written "${det.correct}" (助詞の正書法 第2の1)`,
            messageJa: det.messageJa(token.surface, det.correct),
            from: token.start,
            to: token.end,
            originalText: token.surface,
            reference: REFERENCE,
            fix: {
              label: `Replace with "${det.correct}"`,
              labelJa: det.fixLabelJa(det.correct),
              replacement: det.correct,
            },
          });
        }
      }

      return toolkit.dedupe(issues).sort((a, b) => a.from - b.from);
    }
  }

  return new GkParticleWaOE();
}
