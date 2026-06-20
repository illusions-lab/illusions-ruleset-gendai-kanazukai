/**
 * Tests for gk-particle-wa-o-e — 助詞「は」「を」「へ」の正書法（L2）
 *
 * 現代仮名遣い（昭和61年内閣告示第1号）本文 第2の1 に基づく。
 * 形態素解析トークンを手作りして lintWithTokens を直接呼び出す。
 */
import { describe, it, expect } from "vitest";
import type { Token } from "illusions-lint-sdk";

import ruleset from "../src/index";
import { createTestContext } from "./test-kit";

// Severity for this rule is "info" (FP-prone), so use a matching config.
const INFO_CONFIG = { enabled: true, severity: "info" as const };

const rule = () =>
  ruleset.createRules(createTestContext()).find((r) => r.id === "gk-particle-wa-o-e")!;

// Helper to call lintWithTokens on the L2 rule.
function lint(text: string, tokens: ReadonlyArray<Token>) {
  return (rule() as any).lintWithTokens(text, tokens, INFO_CONFIG);
}

// ---------------------------------------------------------------------------
// Detections — お → を
// ---------------------------------------------------------------------------

describe("gk-particle-wa-o-e — お(格助詞)→「を」の検出", () => {
  it("flags お as 格助詞 (「本お読む」)", () => {
    const text = "本お読む。";
    const tokens: ReadonlyArray<Token> = [
      { surface: "本", pos: "名詞", pos_detail_1: "一般", start: 0, end: 1 },
      { surface: "お", pos: "助詞", pos_detail_1: "格助詞", start: 1, end: 2 },
      { surface: "読む", pos: "動詞", basic_form: "読む", start: 2, end: 4 },
      { surface: "。", pos: "記号", start: 4, end: 5 },
    ];
    const issues = lint(text, tokens);
    expect(issues).toHaveLength(1);
    expect(issues[0].fix?.replacement).toBe("を");
    expect(issues[0].from).toBe(1);
    expect(issues[0].to).toBe(2);
    expect(issues[0].reference?.standard).toContain("現代仮名遣い");
  });

  it("flags お as 係助詞 (「結果おまとめた」)", () => {
    const text = "結果おまとめた。";
    const tokens: ReadonlyArray<Token> = [
      { surface: "結果", pos: "名詞", start: 0, end: 2 },
      { surface: "お", pos: "助詞", pos_detail_1: "係助詞", start: 2, end: 3 },
      { surface: "まとめ", pos: "動詞", basic_form: "まとめる", start: 3, end: 6 },
      { surface: "た", pos: "助動詞", start: 6, end: 7 },
      { surface: "。", pos: "記号", start: 7, end: 8 },
    ];
    const issues = lint(text, tokens);
    expect(issues).toHaveLength(1);
    expect(issues[0].fix?.replacement).toBe("を");
  });

  it("does not flag お as 名詞 (「お茶を飲む」の「お」は接頭辞)", () => {
    const text = "お茶を飲む。";
    const tokens: ReadonlyArray<Token> = [
      { surface: "お", pos: "接頭詞", pos_detail_1: "名詞接続", start: 0, end: 1 },
      { surface: "茶", pos: "名詞", start: 1, end: 2 },
      { surface: "を", pos: "助詞", pos_detail_1: "格助詞", start: 2, end: 3 },
      { surface: "飲む", pos: "動詞", basic_form: "飲む", start: 3, end: 5 },
      { surface: "。", pos: "記号", start: 5, end: 6 },
    ];
    expect(lint(text, tokens)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Detections — え → へ
// ---------------------------------------------------------------------------

describe("gk-particle-wa-o-e — え(格助詞)→「へ」の検出", () => {
  it("flags え as 格助詞 (「東京え行く」)", () => {
    const text = "東京え行く。";
    const tokens: ReadonlyArray<Token> = [
      { surface: "東京", pos: "名詞", pos_detail_1: "固有名詞", start: 0, end: 2 },
      { surface: "え", pos: "助詞", pos_detail_1: "格助詞", start: 2, end: 3 },
      { surface: "行く", pos: "動詞", basic_form: "行く", start: 3, end: 5 },
      { surface: "。", pos: "記号", start: 5, end: 6 },
    ];
    const issues = lint(text, tokens);
    expect(issues).toHaveLength(1);
    expect(issues[0].fix?.replacement).toBe("へ");
    expect(issues[0].from).toBe(2);
    expect(issues[0].to).toBe(3);
  });

  it("does not flag え as 感動詞 (「え、本当に？」の「え」)", () => {
    const text = "え、本当に？";
    const tokens: ReadonlyArray<Token> = [
      { surface: "え", pos: "感動詞", start: 0, end: 1 },
      { surface: "、", pos: "記号", start: 1, end: 2 },
      { surface: "本当", pos: "名詞", start: 2, end: 4 },
      { surface: "に", pos: "助詞", pos_detail_1: "格助詞", start: 4, end: 5 },
      { surface: "？", pos: "記号", start: 5, end: 6 },
    ];
    expect(lint(text, tokens)).toHaveLength(0);
  });

  it("does not flag え as 動詞 (「考えた」の「え」部分は動詞)", () => {
    // 「考え」は動詞連用形であり助詞ではない
    const text = "よく考えた。";
    const tokens: ReadonlyArray<Token> = [
      { surface: "よく", pos: "副詞", start: 0, end: 2 },
      { surface: "考え", pos: "動詞", basic_form: "考える", start: 2, end: 4 },
      { surface: "た", pos: "助動詞", start: 4, end: 5 },
      { surface: "。", pos: "記号", start: 5, end: 6 },
    ];
    expect(lint(text, tokens)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// は/わ の境界 — 終助詞「わ」は検出しない（FP 防止の核心）
// ---------------------------------------------------------------------------

describe("gk-particle-wa-o-e — 終助詞「わ」は検出しない（FP 防止）", () => {
  it("does NOT flag わ as 終助詞 (「そうだわ」)", () => {
    const text = "そうだわ。";
    const tokens: ReadonlyArray<Token> = [
      { surface: "そう", pos: "副詞", start: 0, end: 2 },
      { surface: "だ", pos: "助動詞", start: 2, end: 3 },
      { surface: "わ", pos: "助詞", pos_detail_1: "終助詞", start: 3, end: 4 },
      { surface: "。", pos: "記号", start: 4, end: 5 },
    ];
    expect(lint(text, tokens)).toHaveLength(0);
  });

  it("does NOT flag わ as 終助詞 (「いいわよ」)", () => {
    const text = "いいわよ。";
    const tokens: ReadonlyArray<Token> = [
      { surface: "いい", pos: "形容詞", basic_form: "いい", start: 0, end: 2 },
      { surface: "わ", pos: "助詞", pos_detail_1: "終助詞", start: 2, end: 3 },
      { surface: "よ", pos: "助詞", pos_detail_1: "終助詞", start: 3, end: 4 },
      { surface: "。", pos: "記号", start: 4, end: 5 },
    ];
    expect(lint(text, tokens)).toHaveLength(0);
  });

  it("flags わ as 係助詞 (「わたしわ行く」)", () => {
    const text = "わたしわ行く。";
    const tokens: ReadonlyArray<Token> = [
      { surface: "わたし", pos: "名詞", pos_detail_1: "代名詞", start: 0, end: 3 },
      { surface: "わ", pos: "助詞", pos_detail_1: "係助詞", start: 3, end: 4 },
      { surface: "行く", pos: "動詞", basic_form: "行く", start: 4, end: 6 },
      { surface: "。", pos: "記号", start: 6, end: 7 },
    ];
    const issues = lint(text, tokens);
    expect(issues).toHaveLength(1);
    expect(issues[0].fix?.replacement).toBe("は");
    expect(issues[0].from).toBe(3);
    expect(issues[0].to).toBe(4);
  });

  it("flags わ as 副助詞 (「それわかな」)", () => {
    const text = "それわかな？";
    const tokens: ReadonlyArray<Token> = [
      { surface: "それ", pos: "名詞", pos_detail_1: "代名詞", start: 0, end: 2 },
      { surface: "わ", pos: "助詞", pos_detail_1: "副助詞", start: 2, end: 3 },
      { surface: "か", pos: "助詞", pos_detail_1: "終助詞", start: 3, end: 4 },
      { surface: "な", pos: "助詞", pos_detail_1: "終助詞", start: 4, end: 5 },
      { surface: "？", pos: "記号", start: 5, end: 6 },
    ];
    const issues = lint(text, tokens);
    expect(issues).toHaveLength(1);
    expect(issues[0].fix?.replacement).toBe("は");
  });
});

// ---------------------------------------------------------------------------
// 正しい は/を/へ はスキップ
// ---------------------------------------------------------------------------

describe("gk-particle-wa-o-e — 正しい助詞表記は検出しない", () => {
  it("does not flag は as 係助詞 (「彼女は行く」)", () => {
    const text = "彼女は行く。";
    const tokens: ReadonlyArray<Token> = [
      { surface: "彼女", pos: "名詞", pos_detail_1: "代名詞", start: 0, end: 2 },
      { surface: "は", pos: "助詞", pos_detail_1: "係助詞", start: 2, end: 3 },
      { surface: "行く", pos: "動詞", basic_form: "行く", start: 3, end: 5 },
      { surface: "。", pos: "記号", start: 5, end: 6 },
    ];
    expect(lint(text, tokens)).toHaveLength(0);
  });

  it("does not flag を as 格助詞 (「本を読む」)", () => {
    const text = "本を読む。";
    const tokens: ReadonlyArray<Token> = [
      { surface: "本", pos: "名詞", start: 0, end: 1 },
      { surface: "を", pos: "助詞", pos_detail_1: "格助詞", start: 1, end: 2 },
      { surface: "読む", pos: "動詞", basic_form: "読む", start: 2, end: 4 },
      { surface: "。", pos: "記号", start: 4, end: 5 },
    ];
    expect(lint(text, tokens)).toHaveLength(0);
  });

  it("does not flag へ as 格助詞 (「東京へ行く」)", () => {
    const text = "東京へ行く。";
    const tokens: ReadonlyArray<Token> = [
      { surface: "東京", pos: "名詞", pos_detail_1: "固有名詞", start: 0, end: 2 },
      { surface: "へ", pos: "助詞", pos_detail_1: "格助詞", start: 2, end: 3 },
      { surface: "行く", pos: "動詞", basic_form: "行く", start: 3, end: 5 },
      { surface: "。", pos: "記号", start: 5, end: 6 },
    ];
    expect(lint(text, tokens)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 複数検出・disabled
// ---------------------------------------------------------------------------

describe("gk-particle-wa-o-e — 動作確認", () => {
  it("reports multiple issues in one sentence", () => {
    // 「彼女わ東京え行く」 — わ(係助詞) + え(格助詞)
    const text = "彼女わ東京え行く。";
    const tokens: ReadonlyArray<Token> = [
      { surface: "彼女", pos: "名詞", pos_detail_1: "代名詞", start: 0, end: 2 },
      { surface: "わ", pos: "助詞", pos_detail_1: "係助詞", start: 2, end: 3 },
      { surface: "東京", pos: "名詞", pos_detail_1: "固有名詞", start: 3, end: 5 },
      { surface: "え", pos: "助詞", pos_detail_1: "格助詞", start: 5, end: 6 },
      { surface: "行く", pos: "動詞", basic_form: "行く", start: 6, end: 8 },
      { surface: "。", pos: "記号", start: 8, end: 9 },
    ];
    const issues = lint(text, tokens);
    expect(issues).toHaveLength(2);
    expect(issues[0].from).toBeLessThan(issues[1].from);
    expect(issues[0].fix?.replacement).toBe("は");
    expect(issues[1].fix?.replacement).toBe("へ");
  });

  it("does nothing when disabled", () => {
    const text = "本お読む。";
    const tokens: ReadonlyArray<Token> = [
      { surface: "本", pos: "名詞", start: 0, end: 1 },
      { surface: "お", pos: "助詞", pos_detail_1: "格助詞", start: 1, end: 2 },
      { surface: "読む", pos: "動詞", basic_form: "読む", start: 2, end: 4 },
      { surface: "。", pos: "記号", start: 4, end: 5 },
    ];
    const result = (rule() as any).lintWithTokens(text, tokens, { ...INFO_CONFIG, enabled: false });
    expect(result).toHaveLength(0);
  });

  it("lint() returns empty array (L2 rule — lintWithTokens is the real entry point)", () => {
    expect(rule().lint("本お読む。", INFO_CONFIG)).toHaveLength(0);
  });
});
