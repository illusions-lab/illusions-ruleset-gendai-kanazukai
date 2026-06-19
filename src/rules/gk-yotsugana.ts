/**
 * gk-yotsugana — 四つ仮名（ぢ・づ）の使い分け
 *
 * 現代仮名遣い（昭和61年内閣告示第1号）本文 第2の5(1) は、次の語に「ぢ」「づ」を
 * 用いると定める:
 *   - 同音の連呼: ちぢむ・つづく・つづみ など
 *   - 二語の連合（連濁）: はなぢ・みかづき・そこぢから など
 * これらが「じ」「ず」と誤記された箇所を検出し、「ぢ」「づ」へ修正提案する。
 *
 * 偽陽性回避:
 *   - 各語は「誤記された二字＋直後の語形（lookahead）」でのみ一致させ、別語への
 *     巻き込みを防ぐ（例: 「知事(ちじ)」「図画(ずが)」「地面(じめん)」は不一致）。
 *   - 「きずく(築く)」「〜ずつ(許容)」など、現代仮名遣いで じ/ず が正しい/許容の語は
 *     対象に含めない。
 *   - 「はなじろむ(鼻白む)」を避けるため はなじ は直後が「ろ」でない場合のみ。
 */
import type {
  LintIssue,
  LintRule,
  LintRuleConfig,
  RulesetContext,
  RulesetManifest,
} from "illusions-lint-sdk";

/**
 * 誤記された二字（じ/ず を含む）→ 正しい二字（ぢ/づ）。pattern は lookahead で語形を限定。
 * 収録語はすべて告示 本文 第2の5(1)(2) の語例に基づく（許容語・注意語は対象外）。
 */
const PAIRS: ReadonlyArray<{ pattern: RegExp; correct: string }> = [
  // (1) 同音の連呼: ちぢみ・ちぢむ・ちぢれる・ちぢこまる / つづみ・つづら・つづく・つづめる・つづる
  { pattern: /ちじ(?=み|む|ま[るりれ]|め|こま|れ)/, correct: "ちぢ" },
  { pattern: /つず(?=み|ら|く|け|る|り|め)/, correct: "つづ" },
  // (2) 二語の連合（連濁）
  { pattern: /はなじ(?!ろ)/, correct: "はなぢ" }, // 鼻血（「はなじろむ＝鼻白む」を除外）
  { pattern: /そこじ(?=から)/, correct: "そこぢ" }, // 底力
  { pattern: /ちかじ(?=か)/, correct: "ちかぢ" }, // 近々
  { pattern: /ちりじ(?=り)/, correct: "ちりぢ" }, // ちりぢり
  { pattern: /みかず(?=き)/, correct: "みかづ" }, // 三日月
  { pattern: /たけず(?=つ)/, correct: "たけづ" }, // 竹筒
  { pattern: /たず(?=な)/, correct: "たづ" }, // 手綱（「たずねる＝訪ねる」は ね で除外）
  { pattern: /こず(?=つみ)/, correct: "こづ" }, // 小包
  { pattern: /こず(?=かい)/, correct: "こづ" }, // 小遣い
  { pattern: /てず(?=くり)/, correct: "てづ" }, // 手作り（「てずから」は から で除外）
  { pattern: /みちず(?=れ)/, correct: "みちづ" }, // 道連れ
  { pattern: /かたず(?=く|け|か|い)/, correct: "かたづ" }, // 片付く（「固唾＝かたず＋を/が」は除外）
  { pattern: /もとず(?=く|い|け|か)/, correct: "もとづ" }, // 基づく
  { pattern: /うらず(?=け|か|く)/, correct: "うらづ" }, // 裏付ける
  { pattern: /ゆきず(?=ま)/, correct: "ゆきづ" }, // 行き詰まる（「ゆきずり」は り で除外）
  { pattern: /つくず(?=く)/, correct: "つくづ" }, // つくづく
  { pattern: /つねず(?=ね)/, correct: "つねづ" }, // 常々
  { pattern: /つれず(?=れ)/, correct: "つれづ" }, // つれづれ（「連れずに」は に で除外）
];

const REFERENCE = {
  standard: "現代仮名遣い（昭和61年内閣告示第1号）",
  section: "本文 第2の5(1)",
} as const;

export function createGkYotsugana(ctx: RulesetContext, manifest: RulesetManifest): LintRule {
  const meta = manifest.rules.find((r) => r.ruleId === "gk-yotsugana");
  if (!meta) throw new Error("manifest is missing the gk-yotsugana rule");

  const { AbstractL1Rule } = ctx.bases;
  const { toolkit } = ctx;

  class GkYotsugana extends AbstractL1Rule {
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
            message: `Use ぢ/づ here: "${correct}"`,
            messageJa: `現代仮名遣い（昭和61年内閣告示第1号）に基づき、ここは「${correct}」と表記します。`,
            replacement: () => correct,
            reference: REFERENCE,
            fixLabelJa: `「${correct}」に修正`,
          }),
        );
      }
      // 別パターンが同一スパンを返した場合に備えて重複除去。
      return toolkit.dedupe(issues).sort((a, b) => a.from - b.from);
    }
  }

  return new GkYotsugana(toolkit.toJsonRuleMeta(meta, manifest), {
    id: meta.ruleId,
    name: meta.nameJa,
    nameJa: meta.nameJa,
    description: meta.descriptionJa,
    descriptionJa: meta.descriptionJa,
    defaultConfig: meta.defaultConfig,
  });
}
