# 不動産事業 ワークフロー & AIスクリーニングシステム

- **`docs/WORKFLOW.md`** — 不動産投資事業の全7フェーズを「AIに任せる作業 / 人がやるべき作業」に分解したワークフロー設計書
- **`system/`** — フェーズ2（物件ソーシング〜1次スクリーニング）を自動化するシステム

## クイックスタート

```bash
cd real-estate/system
python3 main.py analyze          # サンプル3物件を分析 → reports/ にレポート生成
```

Python 3.10+ のみで動作（標準ライブラリのみ）。`ANTHROPIC_API_KEY` を設定すると、
マイソク自由文の構造化（`intake`）とAIリスク分析コメントが有効になる（`pip install anthropic` が必要）。

## 構成

| ファイル | 役割 | AI/コード |
|---|---|---|
| `analyzer.py` | 利回り・返済・CF・DSCR・減価償却・出口IRRの計算 | 決定論的コード |
| `scoring.py` | 投資基準(criteria.json)に照らした採点とA〜D判定 | 決定論的コード |
| `report.py` | 物件別レポート＋ランキングのMarkdown生成 | 決定論的コード |
| `ai_advisor.py` | マイソク構造化・定性リスク分析 | Claude API (任意) |
| `main.py` | CLI | — |
| `properties/` | 物件JSON置き場（サンプル3件入り） | — |
| `reports/` | 生成レポート | — |

## 免責

本システムは1次スクリーニング（検討の足切り）用。出力は想定に基づく概算であり、
購入判断は必ず現地調査・レントロール確認・専門家への相談を経て行うこと。
