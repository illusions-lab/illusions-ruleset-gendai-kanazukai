import { describe, it, expect } from "vitest";

import ruleset from "../src/index";
import { createTestContext, CONFIG } from "./test-kit";

const rule = () => ruleset.createRules(createTestContext()).find((r) => r.id === "gk-o-choon")!;

describe("gk-o-choon — detections (誤った「う」長音 → 「お」表記)", () => {
  // すべて告示 本文 第2の6 の語例（誤記形が別語と衝突しない語）に対応。
  const cases: Array<[string, string]> = [
    ["おうかみが現れた。", "おおかみ"], // 狼
    ["これはおうやけの場だ。", "おおやけ"], // 公
    ["こうろぎが鳴く。", "こおろぎ"], // 蟋蟀
    ["ほのうが揺れる。", "ほのお"], // 炎
    ["心からいきどうる。", "いきどお"], // 憤る
    ["手続きがとどこうる。", "とどこお"], // 滞る
    ["いとうしい我が子。", "いとおしい"], // 愛おしい
    ["おうむね賛成だ。", "おおむね"], // 概ね
    ["おうよそ百人いた。", "おおよそ"], // 凡そ
    ["ほうずきを鳴らす。", "ほおずき"], // 鬼灯
    ["おうきな声で笑う。", "おおき"], // 大きな
    ["おうきい荷物。", "おおき"], // 大きい
  ];

  for (const [text, correct] of cases) {
    it(`flags "${text}" → ${correct}`, () => {
      const issues = rule().lint(text, CONFIG);
      expect(issues).toHaveLength(1);
      expect(issues[0].fix?.replacement).toBe(correct);
      expect(issues[0].reference?.standard).toContain("現代仮名遣い");
    });
  }
});

describe("gk-o-choon — 活用形の検出", () => {
  const conjugations: Array<[string, string]> = [
    ["いきどうって席を立つ。", "いきどお"], // 憤って
    ["怒りにいきどうらない。", "いきどお"], // 憤らない
    ["流れがとどこうった。", "とどこお"], // 滞った
  ];
  for (const [text, correct] of conjugations) {
    it(`flags "${text}" → ${correct}`, () => {
      const issues = rule().lint(text, CONFIG);
      expect(issues).toHaveLength(1);
      expect(issues[0].fix?.replacement).toBe(correct);
    });
  }
});

describe("gk-o-choon — false positives", () => {
  const clean = [
    // 正しい「お」表記（誤記形ではない）
    "おおかみが遠ぼえする。",
    "こおろぎが鳴く。",
    "おおむね賛成だ。",
    "おおきな声で笑う。",
    "いとおしい我が子。",
    // 原則どおり「う」を添える長音（誤りではない）
    "おとうさんが帰る。",
    "とうだいが光る。", // 灯台
    "わこうどが集う。", // 若人
    // 除外語（誤記形が別語と衝突するため本ルールでは扱わない）
    "こうりの値段。", // 小売 — 氷(こおり)の誤記形と衝突するため不検出
    "とういつを図る。", // 統一 — 遠い(とおい)の誤記形と衝突
    "おういを継ぐ。", // 王位 — 多い(おおい)の誤記形と衝突
    "ほうほうの体で逃げる。", // 頬(ほお)は扱わない
    "おうせを果たす。", // 逢瀬 — 仰せ(おおせ)は扱わない
    "もようがきれいだ。", // 模様 — 催す(もよおす)は扱わない
    // 「大きい」の語形限定（おうき＋他語尾は不検出）
    "おうきゅう処置をとる。", // 応急 — 大きい(おおき)に巻き込まない
  ];
  for (const text of clean) {
    it(`leaves "${text}" untouched`, () => {
      expect(rule().lint(text, CONFIG)).toHaveLength(0);
    });
  }
});

describe("gk-o-choon — behavior", () => {
  it("does nothing when disabled", () => {
    expect(rule().lint("おうかみが現れた。", { ...CONFIG, enabled: false })).toHaveLength(0);
  });

  it("reports each occurrence with its own span", () => {
    const issues = rule().lint("おうかみとこうろぎ。", CONFIG);
    expect(issues).toHaveLength(2);
    expect(issues[0].from).toBeLessThan(issues[1].from);
  });
});
