# Workout Tracker

筋トレ記録・トレーニング計画・進捗をまとめた Web アプリです。スマホもブラウザから使えます。
データは Supabase(PostgreSQL)に保存され、ログインが必要です。

```
.
├── app/ components/   画面(Next.js)
├── lib/               データ層(db.ts, useData.ts)・型・ユーティリティ
├── supabase/migrations/   データベース定義(SQL)
├── analysis/          Python の分析スクリプト(pandas。アプリ本体とは独立)
└── docs/              設計・計画・テスト仕様
```

## 仕組み

- ブラウザが Supabase に直接アクセスします。専用のサーバーはありません。
- データはサーバーが正です。入力は画面に即時反映され、約 1 秒後に自動保存されます(オフライン編集・端末間の同期はしません)。
- ワークアウト・計画は、SQL 関数で 1 件ずつ**まとめて(トランザクションで)**保存します。
- 種目は「種目マスタ」から選びます(初期種目 + 自分で追加)。記録で使われている種目は削除できません。
- データ保護は Row Level Security で行い、自分のデータだけ読み書きできます。

詳細は `docs/design/` を参照してください。

## セットアップ

### 1. Supabase

1. [Supabase](https://supabase.com) でプロジェクトを作成します。
2. SQL Editor で `supabase/migrations/0002_normalized_schema.sql` を実行します(テーブル・RLS・初期種目・保存関数・ビュー)。
   - **旧バージョン(`documents` テーブル)のデータがある場合のみ**、`0001_init.sql` を実行済みであることを確認し、続けて `0003_migrate_documents.sql` を実行して移行します。
   - 最後に `0004_progress_views.sql`(進捗画面用の集計ビュー)を実行します。新規の場合は `0002` → `0004` の順で、`0003` は不要です。
3. Project Settings → API の **Project URL** と **anon public key** を控えます。
4. アプリ画面に新規登録(サインアップ)は無いため、最初のユーザーは Authentication → Users → **Add user** から手動で作成します(メール確認不要で即ログインできます)。

### 2. 起動

```bash
cp .env.example .env.local   # URL と anon key を記入
npm install
npm run dev
```

`.env.local` が未設定の場合は、設定を促す画面が表示されます。

## 分析(Python)

記録を pandas で分析するスクリプトが `analysis/` にあります。使い方は `analysis/README.md` を参照してください。

## 既知の制限

- 同じワークアウトを複数のタブ・端末で同時に編集すると、後から保存した側が残ります。
- 入力後 1 秒以内にタブを閉じると、最後の入力が保存されないことがあります。
- 通信できない間は保存できません(「再試行」で保存します)。
