/**
 * Tests for gk-iu — 動詞「言う」の正書法（「いう」と書く、「ゆう」と書かない）（L2）
 *
 * 現代仮名遣い（昭和61年内閣告示第1号）本文 第2の2 に基づく。
 * 形態素解析トークンを手作りして lintWithTokens を直接呼び出す。
 */
import { describe, it, expect } from "vitest";
import type { Token } from "illusions-lint-sdk";

import ruleset from "../src/index";
import { createTestContext, CONFIG } from "./test-kit";

const rule = () =>
  ruleset.createRules(createTestContext()).find((r) => r.id === "gk-iu")!;

// Helper to call lintWithTokens on the L2 rule.
function lint(text: string, tokens: ReadonlyArray<Token>) {
  return (rule() as any).lintWithTokens(text, tokens, CONFIG);
}

// ---------------------------------------------------------------------------
// Detections — 基準 A: basic_form === "言う" で判定
// ---------------------------------------------------------------------------

describe("gk-iu — ゆう系活用の検出（basic_form=言う）", () => {
  it("flags ゆう (basic_form=言う)", () => {
    const text = "そうゆうことだ。";
    const tokens: ReadonlyArray<Token> = [
      { surface: "そう", pos: "副詞", start: 0, end: 2 },
      { surface: "ゆう", pos: "動詞", basic_form: "言う", reading: "ユウ", start: 2, end: 4 },
      { surface: "こと", pos: "名詞", pos_detail_1: "非自立", start: 4, end: 6 },
      { surface: "だ", pos: "助動詞", start: 6, end: 7 },
      { surface: "。", pos: "記号", start: 7, end: 8 },
    ];
    const issues = lint(text, tokens);
    expect(issues).toHaveLength(1);
    expect(issues[0].fix?.replacement).toBe("いう");
    expect(issues[0].from).toBe(2);
    expect(issues[0].to).toBe(4);
    expect(issues[0].reference?.standard).toContain("現代仮名遣い");
  });

  it("flags ゆった (basic_form=言う → いった)", () => {
    const text = "先生がゆったことを思い出した。";
    const tokens: ReadonlyArray<Token> = [
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
    const issues = lint(text, tokens);
    expect(issues).toHaveLength(1);
    expect(issues[0].fix?.replacement).toBe("いっ");
    expect(issues[0].from).toBe(3);
    expect(issues[0].to).toBe(5);
  });

  it("flags ゆって (basic_form=言う → いって)", () => {
    const text = "彼がゆってた。";
    const tokens: ReadonlyArray<Token> = [
      { surface: "彼", pos: "名詞", pos_detail_1: "代名詞", start: 0, end: 1 },
      { surface: "が", pos: "助詞", pos_detail_1: "格助詞", start: 1, end: 2 },
      { surface: "ゆっ", pos: "動詞", basic_form: "言う", start: 2, end: 4 },
      { surface: "て", pos: "助詞", pos_detail_1: "接続助詞", start: 4, end: 5 },
      { surface: "た", pos: "助動詞", start: 5, end: 6 },
      { surface: "。", pos: "記号", start: 6, end: 7 },
    ];
    const issues = lint(text, tokens);
    expect(issues).toHaveLength(1);
    expect(issues[0].fix?.replacement).toBe("いっ");
  });

  it("flags ゆわ (basic_form=言う → いわ, as in 「ゆわない」)", () => {
    const text = "そんなこと、ゆわない。";
    const tokens: ReadonlyArray<Token> = [
      { surface: "そんな", pos: "連体詞", start: 0, end: 3 },
      { surface: "こと", pos: "名詞", pos_detail_1: "非自立", start: 3, end: 5 },
      { surface: "、", pos: "記号", start: 5, end: 6 },
      { surface: "ゆわ", pos: "動詞", basic_form: "言う", start: 6, end: 8 },
      { surface: "ない", pos: "助動詞", start: 8, end: 10 },
      { surface: "。", pos: "記号", start: 10, end: 11 },
    ];
    const issues = lint(text, tokens);
    expect(issues).toHaveLength(1);
    expect(issues[0].fix?.replacement).toBe("いわ");
  });

  it("flags ゆえ (basic_form=言う → いえ, as in 「ゆえば」)", () => {
    const text = "はっきりゆえばよかった。";
    const tokens: ReadonlyArray<Token> = [
      { surface: "はっきり", pos: "副詞", start: 0, end: 4 },
      { surface: "ゆえ", pos: "動詞", basic_form: "言う", start: 4, end: 6 },
      { surface: "ば", pos: "助詞", pos_detail_1: "接続助詞", start: 6, end: 7 },
      { surface: "よかっ", pos: "形容詞", start: 7, end: 10 },
      { surface: "た", pos: "助動詞", start: 10, end: 11 },
      { surface: "。", pos: "記号", start: 11, end: 12 },
    ];
    const issues = lint(text, tokens);
    expect(issues).toHaveLength(1);
    expect(issues[0].fix?.replacement).toBe("いえ");
  });
});

// ---------------------------------------------------------------------------
// Detections — 基準 B: basic_form が未知/「*」の場合、surface + reading で判定
// ---------------------------------------------------------------------------

describe("gk-iu — ゆう系活用の検出（reading ベース fallback）", () => {
  it("flags ゆう (surface in IU_SURFACE_MAP + reading=ユウ) when basic_form is unknown", () => {
    const text = "そうゆうわけで。";
    const tokens: ReadonlyArray<Token> = [
      { surface: "そう", pos: "副詞", start: 0, end: 2 },
      { surface: "ゆう", pos: "動詞", basic_form: "*", reading: "ユウ", start: 2, end: 4 },
      { surface: "わけ", pos: "名詞", pos_detail_1: "非自立", start: 4, end: 6 },
      { surface: "で", pos: "助詞", pos_detail_1: "格助詞", start: 6, end: 7 },
      { surface: "。", pos: "記号", start: 7, end: 8 },
    ];
    const issues = lint(text, tokens);
    expect(issues).toHaveLength(1);
    expect(issues[0].fix?.replacement).toBe("いう");
  });
});

// ---------------------------------------------------------------------------
// FP ガード — 名詞「夕（ゆう）」は検出しない
// ---------------------------------------------------------------------------

describe("gk-iu — 偽陽性防止: 名詞「夕（ゆう）」は検出しない", () => {
  it("does not flag 夕 (pos=名詞)", () => {
    const text = "夕暮れの空。";
    const tokens: ReadonlyArray<Token> = [
      { surface: "夕暮れ", pos: "名詞", basic_form: "夕暮れ", reading: "ユウグレ", start: 0, end: 3 },
      { surface: "の", pos: "助詞", pos_detail_1: "連体化", start: 3, end: 4 },
      { surface: "空", pos: "名詞", start: 4, end: 5 },
      { surface: "。", pos: "記号", start: 5, end: 6 },
    ];
    expect(lint(text, tokens)).toHaveLength(0);
  });

  it("does not flag ゆうやけ (名詞, 夕焼け)", () => {
    const text = "ゆうやけが美しい。";
    const tokens: ReadonlyArray<Token> = [
      { surface: "ゆうやけ", pos: "名詞", reading: "ユウヤケ", start: 0, end: 4 },
      { surface: "が", pos: "助詞", pos_detail_1: "格助詞", start: 4, end: 5 },
      { surface: "美しい", pos: "形容詞", start: 5, end: 8 },
      { surface: "。", pos: "記号", start: 8, end: 9 },
    ];
    expect(lint(text, tokens)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// FP ガード — 動詞「結う（ゆう）」は検出しない
// ---------------------------------------------------------------------------

describe("gk-iu — 偽陽性防止: 動詞「結う」は検出しない", () => {
  it("does not flag 結う (basic_form=結う)", () => {
    const text = "髪をゆう。";
    const tokens: ReadonlyArray<Token> = [
      { surface: "髪", pos: "名詞", start: 0, end: 1 },
      { surface: "を", pos: "助詞", pos_detail_1: "格助詞", start: 1, end: 2 },
      { surface: "ゆう", pos: "動詞", basic_form: "結う", reading: "ユウ", start: 2, end: 4 },
      { surface: "。", pos: "記号", start: 4, end: 5 },
    ];
    expect(lint(text, tokens)).toHaveLength(0);
  });

  it("does not flag ゆい (結う連用形, basic_form=結う)", () => {
    const text = "髪をゆい上げる。";
    const tokens: ReadonlyArray<Token> = [
      { surface: "髪", pos: "名詞", start: 0, end: 1 },
      { surface: "を", pos: "助詞", pos_detail_1: "格助詞", start: 1, end: 2 },
      { surface: "ゆい", pos: "動詞", basic_form: "結う", reading: "ユイ", start: 2, end: 4 },
      { surface: "上げる", pos: "動詞", basic_form: "上げる", start: 4, end: 7 },
      { surface: "。", pos: "記号", start: 7, end: 8 },
    ];
    expect(lint(text, tokens)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// FP ガード — 正しい「いう」系は検出しない
// ---------------------------------------------------------------------------

describe("gk-iu — 正しい「いう」系は検出しない", () => {
  it("does not flag いう (basic_form=言う, correct form)", () => {
    const text = "そういうことだ。";
    const tokens: ReadonlyArray<Token> = [
      { surface: "そう", pos: "副詞", start: 0, end: 2 },
      { surface: "いう", pos: "動詞", basic_form: "言う", reading: "イウ", start: 2, end: 4 },
      { surface: "こと", pos: "名詞", pos_detail_1: "非自立", start: 4, end: 6 },
      { surface: "だ", pos: "助動詞", start: 6, end: 7 },
      { surface: "。", pos: "記号", start: 7, end: 8 },
    ];
    expect(lint(text, tokens)).toHaveLength(0);
  });

  it("does not flag いっ (言う促音便, basic_form=言う, surface starts with い)", () => {
    const text = "先生がいったことだ。";
    const tokens: ReadonlyArray<Token> = [
      { surface: "先生", pos: "名詞", start: 0, end: 2 },
      { surface: "が", pos: "助詞", pos_detail_1: "格助詞", start: 2, end: 3 },
      { surface: "いっ", pos: "動詞", basic_form: "言う", start: 3, end: 5 },
      { surface: "た", pos: "助動詞", start: 5, end: 6 },
      { surface: "こと", pos: "名詞", pos_detail_1: "非自立", start: 6, end: 8 },
      { surface: "だ", pos: "助動詞", start: 8, end: 9 },
      { surface: "。", pos: "記号", start: 9, end: 10 },
    ];
    expect(lint(text, tokens)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// POS 境界テスト — 動詞以外の pos では検出しない
// ---------------------------------------------------------------------------

describe("gk-iu — POS 境界: 動詞以外は検出しない", () => {
  it("does not flag ゆう as 名詞 (even if reading=ユウ)", () => {
    const text = "ゆうきを出す。";
    const tokens: ReadonlyArray<Token> = [
      { surface: "ゆうき", pos: "名詞", reading: "ユウキ", start: 0, end: 3 },
      { surface: "を", pos: "助詞", pos_detail_1: "格助詞", start: 3, end: 4 },
      { surface: "出す", pos: "動詞", basic_form: "出す", start: 4, end: 6 },
      { surface: "。", pos: "記号", start: 6, end: 7 },
    ];
    expect(lint(text, tokens)).toHaveLength(0);
  });

  it("does not flag ゆう as 形容詞", () => {
    const tokens: ReadonlyArray<Token> = [
      { surface: "ゆう", pos: "形容詞", basic_form: "ゆう", reading: "ユウ", start: 0, end: 2 },
    ];
    expect(lint("ゆう", tokens)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 動作確認
// ---------------------------------------------------------------------------

describe("gk-iu — 動作確認", () => {
  it("does nothing when disabled", () => {
    const text = "そうゆうことだ。";
    const tokens: ReadonlyArray<Token> = [
      { surface: "そう", pos: "副詞", start: 0, end: 2 },
      { surface: "ゆう", pos: "動詞", basic_form: "言う", reading: "ユウ", start: 2, end: 4 },
      { surface: "こと", pos: "名詞", pos_detail_1: "非自立", start: 4, end: 6 },
      { surface: "だ", pos: "助動詞", start: 6, end: 7 },
      { surface: "。", pos: "記号", start: 7, end: 8 },
    ];
    const result = (rule() as any).lintWithTokens(text, tokens, { ...CONFIG, enabled: false });
    expect(result).toHaveLength(0);
  });

  it("lint() returns empty array (L2 rule — lintWithTokens is the real entry point)", () => {
    expect(rule().lint("そうゆうことだ。", CONFIG)).toHaveLength(0);
  });

  it("reports multiple instances in one text", () => {
    const text = "ゆうかゆわないか。";
    const tokens: ReadonlyArray<Token> = [
      { surface: "ゆう", pos: "動詞", basic_form: "言う", start: 0, end: 2 },
      { surface: "か", pos: "助詞", pos_detail_1: "終助詞", start: 2, end: 3 },
      { surface: "ゆわ", pos: "動詞", basic_form: "言う", start: 3, end: 5 },
      { surface: "ない", pos: "助動詞", start: 5, end: 7 },
      { surface: "か", pos: "助詞", pos_detail_1: "終助詞", start: 7, end: 8 },
      { surface: "。", pos: "記号", start: 8, end: 9 },
    ];
    const issues = lint(text, tokens);
    expect(issues).toHaveLength(2);
    expect(issues[0].from).toBeLessThan(issues[1].from);
    expect(issues[0].fix?.replacement).toBe("いう");
    expect(issues[1].fix?.replacement).toBe("いわ");
  });
});
