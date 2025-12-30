# Attention Training App (臨床リハビリテーションツール)

画面内のランダムな位置に出現する光を素早くタップして得点する、持続性注意と反応速度のトレーニングアプリです。
高次脳機能障害のリハビリテーション支援ツールとして開発されました。

## 🎯 アプリの概要

*   **目的:** 注意障害（特に持続性注意、選択的注意）のリハビリテーション、半側空間無視の評価・訓練
*   **対象:** 高次脳機能障害のある方、または集中力を高めたい一般の方
*   **主な機能:**
    *   **反応課題:** ランダムに出現するターゲットをタップ
    *   **選択的注意課題:** 「お邪魔ターゲット（歯車）」を避けて正解のみをタップ
    *   **難易度調整:** 4段階（かんたん〜げきむず）＋制限時間・音量設定
    *   **詳細分析:**
        *   **ヒートマップ:** タップ位置を可視化し、空間無視の傾向を分析
        *   **集中力推移グラフ:** 時間経過に伴う反応速度の変化をグラフ化
    *   **PWA対応:** ホーム画面に追加してオフラインでも動作可能

## 🛠 技術スタック

このプロジェクトは、モダンなWeb技術を用いて開発された静的Webアプリケーション（SPA）です。

*   **Frontend Framework:** [React 19](https://react.dev/)
*   **Build Tool:** [Vite](https://vitejs.dev/)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
*   **UI Components:** [shadcn/ui](https://ui.shadcn.com/) (Radix UI based)
*   **Charts:** [Recharts](https://recharts.org/) (for concentration graph)
*   **PWA:** [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
*   **Routing:** [wouter](https://github.com/molefrog/wouter)

## 🚀 開発環境のセットアップ

```bash
# リポジトリのクローン
git clone https://github.com/ameRese/attention-training-app.git
cd attention-training-app

# 依存関係のインストール
pnpm install

# 開発サーバーの起動
pnpm dev
```

## 📱 推奨環境

*   **OS:** iOS 15+, Android 10+, Windows/Mac (Chrome/Edge/Safari)
*   **Device:** スマートフォン、タブレットでの利用を推奨（タッチ操作に最適化）

## 📄 ライセンス

MIT License
