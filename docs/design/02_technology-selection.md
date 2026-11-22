# 技術選定

使用技術は `package.json` から確認した**事実**です。「選定理由」「他の選択肢」「メリット・デメリット」は一般的な知識に基づく**推測**です(当時の判断記録がないため)。違っていれば修正してください。

| 技術 | バージョン(事実) | 用途 |
| --- | --- | --- |
| Next.js (App Router) | 14.2.5 | Web アプリ |
| React | 18 | UI |
| TypeScript | 5 | 型 |
| Tailwind CSS | 3.4 | スタイル |
| lucide-react | 0.436 | アイコン |
| Supabase(`supabase-js` 2.x) | - | 認証・PostgreSQL・RLS |

## 各技術の整理

### Next.js + React + TypeScript
- **選定理由(推測)**: React の学習になり、Vercel へのデプロイが簡単。型でデータの形を明確にできる。
- **他の選択肢**: Vite + React(より軽量)。
- **デメリット**: 現状は 1 ページ構成で、Next.js の機能は活かしきれていない。
- **コスト**: 無料(Vercel の無料枠でデプロイ可能)。

### Supabase(認証・PostgreSQL・RLS)
- **選定理由(推測)**: 認証と DB が揃い、バックエンドを自作せずに済む。PostgreSQL は方針書の基本候補。
- **他の選択肢**: Neon + 自作 API、Google Cloud SQL + Cloud Run、Firebase。
- **メリット**: 無料枠で始められる。RLS でデータ保護できる。SQL 関数でまとめて保存できる(`save_workout`)。
- **デメリット**: 無料プランには制限があり、一定期間使わないとプロジェクトが停止する場合がある(最新の条件は要確認)。
- **コスト**: 無料枠内で運用中かは要確認。

### 正規化した PostgreSQL スキーマ
- 判断の経緯は `06_redesign-adr.md`。集計(進捗・Python 分析)を SQL で書きやすくするため。

### Python(pandas / matplotlib / requests)— 分析スクリプト
- **選定理由**: 開発者の希望(Python の学習)。分析は pandas が標準的。
- **構成**: アプリ本体とは独立(`analysis/`)。BigQuery は使わない(データ量が小さく、Supabase で足りるため)。
- **デメリット**: アプリの画面には組み込まれない(CSV とグラフ画像の出力)。

## 削除した技術
- Expo / React Native(モバイル版)。ブラウザで使えるため。
- 独自の同期エンジン。オンライン前提に簡素化したため。
