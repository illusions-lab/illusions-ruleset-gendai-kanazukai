# illusions-ruleset-gendai-kanazukai

illusions 校正(lint)ルールセット — **現代仮名遣い（昭和61年内閣告示第1号）**。

[illusions-ruleset-template](https://github.com/illusions-lab/illusions-ruleset-template) から作成。
ビルド成果物（`dist/index.js` + `manifest.json`）を illusions の `~/.illusions/rulesets/<id>/` に置くと
読み込まれる（Electron 版のみ。Web 版は本体同梱ルールのみ）。

## 収録ルール

| ruleId         | 内容                                                                 | 出典                         |
| -------------- | -------------------------------------------------------------------- | ---------------------------- |
| `gk-yotsugana` | 四つ仮名（ぢ・づ）の使い分け。「ぢ」「づ」を用いる語が「じ」「ず」と誤記された箇所を検出 | 現代仮名遣い 本文 第2の5(1)(2) |

各ルールの詳細は [`docs/rules/`](./docs/rules/) を参照。告示の**許容語**（いなずま・せかいじゅう 等）と
**注意語**（じめん・ずが 等）は誤りではないため指摘しない。

## クイックスタート

```bash
npm install
npm run check     # validate + typecheck + test + build
```

`dist/index.js` が生成される。`manifest.json` と一緒に配布する。

## ディレクトリ構成

```
.
├── manifest.json                 # ルールセットのメタ（コードを実行せず読める純データ）
├── src/
│   ├── index.ts                  # default export: RulesetModule
│   └── rules/gk-yotsugana.ts     # ルール実装（ctx.toolkit 経由）
├── docs/rules/gk-yotsugana.md    # 校正目録（1ルール=1ファイル）
├── test/                         # ゴールデン + 検出 + 偽陽性テスト
└── types/illusions-lint-sdk.d.ts # SDK 型契約（import type 用）
```

## ルールの書き方（要点）

- ルールセットは `RulesetModule` を **default export** する（`src/index.ts`）。
- `manifest.maintainerEmail`（**必須**）= メンテナ連絡先。各ルールの `applicableModes`（**必須**）= 自動有効化
  される校正モード（`novel`/`official`/`blog`/`academic`/`sns`、空配列は手動のみ）。
- `createRules(ctx)` は基底クラス・道具を `ctx.bases`/`ctx.toolkit` から受け取る。**SDK は `import type` のみ**。
- 標準に基づくルールは、必ず**原典の語例**に照らし、許容語・例外語を**偽陽性テスト**で守る。

## テスト（必須）

`test/test-kit.ts` の `createTestContext()` が illusions 実行時と同等の `ctx` を提供する。各ルールに
positive→0 / negative→≥1 のゴールデンに加え、検出例・偽陽性例（告示の許容語/注意語）を網羅する。

```bash
npm test
```

## 配布・公開

- **フォルダ配布**: `dist/index.js` + `manifest.json` を `~/.illusions/rulesets/<id>/` に置く。
- **マーケットプレイス**: GitHub リポジトリに topic **`illusions-ruleset`** を付けると、illusions が自動収集し、
  ウイルススキャン後に自動上市する。
- **リリース**: `v*` タグを push すると `dist/index.js` + `manifest.json` がリリースに添付される。

## ライセンス・審査

- 本リポジトリは MIT。ルールセットはオープン／クローズド、商用利用いずれも可。クローズドソースを
  marketplace に上架する場合は illusions team のソースコード審査が必要（[TERMS.md](./TERMS.md) 参照）。

## バージョン互換

`manifest.json` の `engineApi` は illusions 側の `ENGINE_API_VERSION`（現在 **1**）と一致させること。
