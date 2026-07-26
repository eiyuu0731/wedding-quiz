# wedding-quiz

結婚式用のカラードレス当てクイズサイトです。

アプリの本体は [`wedding_quiz/`](./wedding_quiz) にあります。機能の詳細・カスタマイズ方法は
[`wedding_quiz/README.md`](./wedding_quiz/README.md) を参照してください。

## クイックスタート

```bash
cd wedding_quiz
pnpm install
pnpm dev
```

## リポジトリ構成

```
wedding_quiz/
├── src/
│   ├── components/   # 各画面（Welcome / Quiz / Countdown / Reveal / Results / Ranking / QRCode）
│   ├── context/      # QuizContext（回答状態の管理）
│   ├── data/         # quizData.ts（問題と正解の定義）
│   └── App.tsx       # ルーティング
└── package.json
```
