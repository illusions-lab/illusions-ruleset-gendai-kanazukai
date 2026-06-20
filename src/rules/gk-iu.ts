/**
 * gk-iu — 動詞「言う」は「いう」と書く（「ゆう」と書かない）
 *
 * 現代仮名遣い（昭和61年内閣告示第1号）本文 第2の2 は、語を歴史的仮名遣い
 * ではなく現代語の発音に基づき書くことを原則とするが、動詞「言う」については
 * 「ゆう」という口語発音に引きずられて書く誤りが多いため、告示の趣旨に則り
 * 「いう」と書くことを求める。
 * （告示本文では「いう（言う）」の表記形が例示されている。）
 *
 * 本ルールは形態素解析トークンを利用して、動詞「言う」が「ゆう」系の活用形
 * （ゆう・ゆった・ゆって・ゆわない・ゆえば 等）で記されている箇所を検出する。
 *
 * 偽陽性回避:
 *   - POS が「動詞」のトークンのみ対象とする。
 *   - basic_form（原形）が「言う」であることを確認する（kuromoji は「ゆう」を
 *     言う の口語活用と認識し basic_form=「言う」を返すことがある）。
 *   - basic_form の確認が取れない場合は surface の先頭が「ゆ」で始まり、
 *     かつ reading が「ユ」で始まることを条件に加える。
 *   - 名詞「夕（ゆう）」は POS=名詞 であるため除外される。
 *   - 「融通（ゆうずう）」「勇気（ゆうき）」等は動詞ではないため除外される。
 *   - 動詞「結う（ゆう）」（髪を結う）は basic_form が「結う」となり
 *     「言う」とは異なるため除外される。
 *
 * 出典: 現代仮名遣い（昭和61年内閣告示第1号）本文 第2の2
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
  section: "本文 第2の2",
} as const;

/**
 * 「ゆう」系活用形の surface → 対応する「いう」系活用形。
 * surface が完全一致した場合に使う優先マッピング。
 * kuromoji が「ゆう」を独立した活用形として返すケースに対応。
 */
const IU_SURFACE_MAP: ReadonlyMap<string, string> = new Map([
  ["ゆう", "いう"],
  ["ゆわ", "いわ"],
  ["ゆい", "いい"],
  ["ゆっ", "いっ"],
  ["ゆえ", "いえ"],
]);

/**
 * basic_form が「言う」の動詞トークンで、surface の先頭が「ゆ」の場合に
 * surface 先頭の「ゆ」→「い」を置換して推奨形を生成する。
 */
function deriveCorrection(surface: string): string {
  const exact = IU_SURFACE_MAP.get(surface);
  if (exact) return exact;
  // 先頭の「ゆ」→「い」へ置換（ゆった→いった、ゆって→いって、ゆわない→いわない 等）
  if (surface.startsWith("ゆ")) return "い" + surface.slice(1);
  return surface;
}

/**
 * basic_form が「不明」とみなせる値の集合。
 * kuromoji は未知語や解析失敗時に「*」または空文字を返すことがある。
 */
const UNKNOWN_BASIC_FORMS: ReadonlySet<string | undefined> = new Set([undefined, "", "*"]);

/**
 * トークンが「ゆう」系の言う動詞かを判定する。
 *
 * 判定基準（いずれかが成立すれば検出する）:
 *   A. pos==="動詞" && basic_form==="言う" && surface が「ゆ」で始まる
 *   B. pos==="動詞" && basic_form が不明（undefined/"" /"*"）&& surface が「ゆ」で始まる
 *      && reading が「ユ」で始まる && IU_SURFACE_MAP に surface が含まれる
 *
 * 基準 B は basic_form が明示的に別の語（「結う」等）と判明している場合は適用しない。
 */
function isYuuIuVerb(token: Token): boolean {
  if (token.pos !== "動詞") return false;

  const surface = token.surface;
  if (!surface.startsWith("ゆ")) return false;

  // 基準 A: kuromoji が basic_form=言う を返した場合（最も信頼性が高い）
  if (token.basic_form === "言う") return true;

  // 基準 B: basic_form が不明の場合のみ、surface + reading で限定判定。
  // basic_form が別の語（「結う」等）と判明していれば適用しない。
  if (!UNKNOWN_BASIC_FORMS.has(token.basic_form)) return false;
  const reading = token.reading ?? "";
  if (reading.startsWith("ユ") && IU_SURFACE_MAP.has(surface)) return true;

  return false;
}

export function createGkIu(ctx: RulesetContext, manifest: RulesetManifest): LintRule {
  const metaEntry = manifest.rules.find((r) => r.ruleId === "gk-iu");
  if (!metaEntry) throw new Error("manifest is missing the gk-iu rule");

  const { AbstractMorphologicalLintRule } = ctx.bases;
  const { toolkit } = ctx;

  const ruleId: string = metaEntry.ruleId;
  const nameJa: string = metaEntry.nameJa;
  const descriptionJa: string = metaEntry.descriptionJa;
  const defaultConfig = metaEntry.defaultConfig;
  const ruleMeta = toolkit.toJsonRuleMeta(metaEntry, manifest);

  class GkIu extends AbstractMorphologicalLintRule {
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
        if (!isYuuIuVerb(token)) continue;

        const correct = deriveCorrection(token.surface);

        // surface が既に正しい場合はスキップ（安全弁）
        if (token.surface === correct) continue;

        issues.push({
          ruleId: this.id,
          severity: config.severity,
          message: `Verb "言う" should be written "${correct}", not "${token.surface}"`,
          messageJa: `現代仮名遣い（昭和61年内閣告示第1号）に基づき、動詞「言う」は「いう」と書きます。「${token.surface}」は「${correct}」と修正してください（第2の2）。`,
          from: token.start,
          to: token.end,
          originalText: token.surface,
          reference: REFERENCE,
          fix: {
            label: `Replace with "${correct}"`,
            labelJa: `「${correct}」に修正`,
            replacement: correct,
          },
        });
      }

      return toolkit.dedupe(issues).sort((a, b) => a.from - b.from);
    }
  }

  return new GkIu();
}
