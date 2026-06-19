/**
 * gk-o-choon — オ列長音の例外語（「お」を添えて書く語）
 *
 * 現代仮名遣い（昭和61年内閣告示第1号）本文 第2の6 は、オ列の長音は原則オ列の
 * 仮名に「う」を添えて書く（例: おとうさん・とうだい）が、次の語は歴史的仮名遣いで
 * オ列の仮名に「ほ」「を」が続いたものであり、「お」を添えて書くと定める:
 *   おおかみ・おおやけ・こおろぎ・ほのお・いきどおる・とどこおる・いとおしい・
 *   おおむね・おおよそ・おおきい（大きい）・ほおずき など。
 * これらが「う」を添えた長音（おうかみ・こうろぎ 等）で誤記された箇所を検出し、
 * 「お」表記へ修正提案する。
 *
 * 偽陽性回避（高精度方針）:
 *   - 収録するのは「誤記形が独立した別語になり得ない語」のみ。
 *     例えば「氷（こおり）」は誤記形「こうり」が「小売・行李」等と衝突するため除外。
 *     「十（とお）」「頬（ほお）」「仰せ（おおせ）」「多い（おおい）」「遠い（とおい）」
 *     「通る（とおる）」も同様に誤記形が別語と衝突するため、本ルールでは扱わない。
 *   - 活用語（憤る・滞る）は語幹＋直後の活用語尾（lookahead）でのみ一致させる。
 *   - 「大きい」は おうき＋（い／な／く／かっ）に限定し、「王気」等への巻き込みを防ぐ。
 */
import type {
  LintIssue,
  LintRule,
  LintRuleConfig,
  RulesetContext,
  RulesetManifest,
} from "illusions-lint-sdk";

/**
 * 誤記形（「う」を添えた長音）→ 正しい表記（「お」を添えた長音）。
 * すべて告示 本文 第2の6 の語例に基づき、誤記形が別語と衝突しない語のみ収録。
 */
const PAIRS: ReadonlyArray<{ pattern: RegExp; correct: string }> = [
  { pattern: /おうかみ/, correct: "おおかみ" }, // 狼
  { pattern: /おうやけ/, correct: "おおやけ" }, // 公
  { pattern: /こうろぎ/, correct: "こおろぎ" }, // 蟋蟀
  { pattern: /ほのう/, correct: "ほのお" }, // 炎
  { pattern: /いきどう(?=る|っ|ら|り|れ)/, correct: "いきどお" }, // 憤る
  { pattern: /とどこう(?=る|っ|ら|り|れ)/, correct: "とどこお" }, // 滞る
  { pattern: /いとうしい/, correct: "いとおしい" }, // 愛おしい
  { pattern: /おうむね/, correct: "おおむね" }, // 概ね
  { pattern: /おうよそ/, correct: "おおよそ" }, // 凡そ
  { pattern: /ほうずき/, correct: "ほおずき" }, // 鬼灯
  { pattern: /おうき(?=い|な|く|かっ)/, correct: "おおき" }, // 大きい／大きな／大きく
];

const REFERENCE = {
  standard: "現代仮名遣い（昭和61年内閣告示第1号）",
  section: "本文 第2の6",
} as const;

export function createGkOChoon(ctx: RulesetContext, manifest: RulesetManifest): LintRule {
  const meta = manifest.rules.find((r) => r.ruleId === "gk-o-choon");
  if (!meta) throw new Error("manifest is missing the gk-o-choon rule");

  const { AbstractL1Rule } = ctx.bases;
  const { toolkit } = ctx;

  class GkOChoon extends AbstractL1Rule {
    lint(text: string, config: LintRuleConfig): LintIssue[] {
      if (!config.enabled) return [];
      const issues: LintIssue[] = [];
      for (const { pattern, correct } of PAIRS) {
        issues.push(
          ...toolkit.regexReplace({
            text,
            pattern,
            ruleId: this.id,
            severity: config.severity,
            message: `Use お-row long vowel here: "${correct}"`,
            messageJa: `現代仮名遣い（昭和61年内閣告示第1号）に基づき、ここは「${correct}」と表記します。`,
            replacement: () => correct,
            reference: REFERENCE,
            fixLabelJa: `「${correct}」に修正`,
          }),
        );
      }
      return toolkit.dedupe(issues).sort((a, b) => a.from - b.from);
    }
  }

  return new GkOChoon(toolkit.toJsonRuleMeta(meta, manifest), {
    id: meta.ruleId,
    name: meta.nameJa,
    nameJa: meta.nameJa,
    description: meta.descriptionJa,
    descriptionJa: meta.descriptionJa,
    defaultConfig: meta.defaultConfig,
  });
}
