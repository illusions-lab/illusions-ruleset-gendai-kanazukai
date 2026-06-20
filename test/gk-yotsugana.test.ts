import { describe, it, expect } from "vitest";

import ruleset from "../src/index";
import manifest from "../manifest.json";
import { createTestContext, CONFIG, lintText } from "./test-kit";

const rule = () => ruleset.createRules(createTestContext()).find((r) => r.id === "gk-yotsugana")!;

/**
 * Golden tests driven by manifest.docs so the 校正目録 (docs) and tests stay in
 * sync: every rule's positive example yields 0 issues, negative example >= 1.
 */
describe("ruleset golden examples", () => {
  const rules = ruleset.createRules(createTestContext());
  for (const meta of manifest.rules) {
    describe(meta.ruleId, () => {
      const r = rules.find((x) => x.id === meta.ruleId);
      it("is built by createRules", () => {
        expect(r, `rule ${meta.ruleId} not returned by createRules`).toBeDefined();
      });
      it("positive example yields no issue", () => {
        expect(lintText(r!, meta.docs.positiveExample, CONFIG)).toHaveLength(0);
      });
      it("negative example is flagged", () => {
        expect(lintText(r!, meta.docs.negativeExample, CONFIG).length).toBeGreaterThan(0);
      });
    });
  }
});

describe("gk-yotsugana — detections (誤った じ/ず → ぢ/づ)", () => {
  // すべて告示 本文 第2の5(1)(2) の語例に対応。
  const cases: Array<[string, string]> = [
    // (1) 同音の連呼
    ["ちじみ織りの服。", "ちぢ"], // 縮み（原文 第2-5(1)）
    ["シャツがちじむ。", "ちぢ"],
    ["かみがちじれる。", "ちぢ"],
    ["はなしがつずく。", "つづ"],
    ["つずみを打つ。", "つづ"],
    // (2) 二語の連合（連濁）
    ["はなじが出た。", "はなぢ"], // 鼻血
    ["そこじからを出す。", "そこぢ"], // 底力
    ["ちかじか会おう。", "ちかぢ"], // 近々
    ["かみがちりじりになる。", "ちりぢ"], // ちりぢり
    ["みかずきが見える。", "みかづ"], // 三日月
    ["たけずつに入れる。", "たけづ"], // 竹筒
    ["うまのたずなを引く。", "たづ"], // 手綱
    ["こずつみが届く。", "こづ"], // 小包
    ["こずかいをもらう。", "こづ"], // 小遣い
    ["てずくりのケーキ。", "てづ"], // 手作り
    ["みちずれにする。", "みちづ"], // 道連れ
    ["部屋をかたずける。", "かたづ"], // 片付ける
    ["データにもとずく。", "もとづ"], // 基づく
    ["証言でうらずける。", "うらづ"], // 裏付ける
    ["話がゆきずまる。", "ゆきづ"], // 行き詰まる
    ["つくずく嫌になる。", "つくづ"], // つくづく
    ["つねずね思う。", "つねづ"], // 常々
    ["つれずれなるままに。", "つれづ"], // つれづれ
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

describe("gk-yotsugana — false positives (告示が じ/ず とする語は対象外)", () => {
  const clean = [
    // 同音連呼の〔注意〕: じ で書く
    "いちじくを食べる。", // 無花果
    "いちじるしい進歩。", // 著しい
    // 第2-5(2) 許容（本則 じ/ず、ぢ/づ も可）— 誤りではないので指摘しない
    "いなずまが光る。", // 稲妻
    "せかいじゅうを旅する。", // 世界中
    "こくりとうなずく。", // 頷く
    "石につまずく。", // 躓く
    "ひとつずつ進める。", // 〜ずつ
    "さかずきを交わす。", // 杯
    "ほおずきを鳴らす。", // 鬼灯
    "ゆうずうが利く。", // 融通
    "きずなを深める。", // 絆
    // 第2-5(2) 注意: 漢字音でもともと濁る じ/ず
    "じめんに座る。", // 地面
    "ずがの時間。", // 図画
    "ぬのじを裁つ。", // 布地
    "りゃくずを描く。", // 略図
    // lookahead 除外語
    "はなじろむほど驚く。", // 鼻白む
    "道をたずねる。", // 訪ねる
    "ゆきずりの人。", // 行きずり
    "彼をつれずに行く。", // 連れずに
    "てずから作る。", // 手ずから
    "かたずをのむ。", // 固唾
    // 正しい ぢ/づ 表記
    "シャツがちぢむ。",
    "はなしがつづく。",
    "みかづきが見える。",
    "部屋をかたづける。",
  ];
  for (const text of clean) {
    it(`leaves "${text}" untouched`, () => {
      expect(rule().lint(text, CONFIG)).toHaveLength(0);
    });
  }
});

describe("gk-yotsugana — behavior", () => {
  it("does nothing when disabled", () => {
    expect(rule().lint("シャツがちじむ。", { ...CONFIG, enabled: false })).toHaveLength(0);
  });

  it("reports each occurrence with its own span", () => {
    const issues = rule().lint("ちじむし、つずく。", CONFIG);
    expect(issues).toHaveLength(2);
    expect(issues[0].from).toBeLessThan(issues[1].from);
  });
});
