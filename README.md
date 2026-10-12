# Workout Tracker

筋トレ記録・トレーニング計画・栄養管理・進捗をまとめたアプリです。**Web 版**(Next.js)と**モバイル版**(Expo / React Native)の
どちらからでも同じデータを操作でき、Supabase を介して同期されます。

```
.
├── app/ components/ lib/   Web 版 (Next.js)
├── mobile/                 モバイル版 (Expo / React Native)
├── shared/                 Web・モバイル共通コード(型・ユーティリティ・同期エンジン・データ用フック)
└── supabase/migrations/    データベース定義
```

## 仕組み

- データは Supabase の `documents` テーブル 1 枚に JSON として保存します(ユーザーごとに Row Level Security で分離)。
- 各端末はローカルにもキャッシュを持つので、オフラインでも使えます。オンラインになると自動で同期します。
- 同期は「ローカル / サーバー / 前回同期時点」の 3 点比較です(`shared/sync.ts`)。
  - 別端末で追加・編集・削除した内容は、次の同期(リアルタイム通知・アプリ復帰時・起動時)で反映されます。
  - **同じ項目を両方の端末で同時に(オフライン中に)編集した場合は、後から同期した側の内容が残ります。**
- Supabase を設定しない場合は、これまで通りその端末だけに保存するローカルモードで動きます。

## セットアップ

### 1. Supabase

1. [Supabase](https://supabase.com) でプロジェクトを作成します。
2. SQL Editor で `supabase/migrations/0001_init.sql` を実行します(テーブル・RLS・リアルタイム設定)。
3. Project Settings → API の **Project URL** と **anon public key** を控えます。
4. (開発中に便利)Authentication → Providers → Email で「Confirm email」をオフにすると、確認メールなしで登録できます。

### 2. Web 版

```bash
cp .env.example .env.local   # URL と anon key を記入
npm install
npm run dev
```

### 3. モバイル版

```bash
cd mobile
cp .env.example .env         # Web 版と同じ URL / anon key を記入
npm install
npx expo start               # Expo Go で QR を読み取る、または a / i でエミュレータを起動
```

ストア配布用のビルドは [EAS Build](https://docs.expo.dev/build/introduction/) を使います
(`app.json` に `ios.bundleIdentifier` / `android.package` を設定してください)。

## 既知の制限

- 栄養ログは日付ごとに 1 件です(同期のキーが日付のため)。
- 日付は UTC 基準で計算しています(`toISOString()`)。日本時間の 0〜9 時台は「前日」になることがあります(既存仕様)。
