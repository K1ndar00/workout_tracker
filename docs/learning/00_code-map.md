# コード地図(ファイルの役割と読む順番)

ローカルでファイルを開きながら読むための地図です。行数は 2026-11 時点の目安です。
「事実」はコードから確認できること、「推測」はコードから読み取った意図です。

## 1. 全体像

```
ブラウザ
 ┌────────────────────────────────────────────────────────────┐
 │ app/page.tsx  ← 画面全体の司令塔(どの画面を出すか)         │
 │   │                                                        │
 │   ├─ components/*   画面の部品(見た目と入力)               │
 │   │                                                        │
 │   └─ lib/useData.ts データの管理と自動保存(React のフック)  │
 │         │                                                  │
 │         └─ lib/db.ts  Supabase との通信(ここだけ)         │
 │               │                                            │
 │               └─ lib/supabase.ts  接続の設定               │
 └───────────────┼────────────────────────────────────────────┘
                 ▼ インターネット
          Supabase(認証・PostgreSQL・権限 RLS)
            └ supabase/migrations/*.sql  DB の定義
```

- 上から下へ「呼ぶ」関係です。下のファイルは、上のファイルを知りません。
- **層ごとの担当**
  - 画面の部品(`components/`): 表示と、ユーザーの操作の受け取り。
  - データ管理(`lib/useData.ts`): 画面の状態、自動保存、エラーの扱い。
  - 通信(`lib/db.ts`): DB への読み書きだけ。
  - DB(`supabase/`): データの保存、整合性、権限、まとめて保存する関数、集計。

## 2. ディレクトリごとの担当

| 場所 | 担当 |
| --- | --- |
| `app/` | Next.js の入り口。ページと全体のレイアウト |
| `components/` | 画面の部品 |
| `lib/` | データ層・型・ユーティリティ(画面に依存しない) |
| `supabase/migrations/` | DB の定義(SQL)。番号順に実行する |
| `analysis/` | Python の分析。**アプリ本体とは独立**(アプリは呼ばない) |
| `docs/` | 設計・計画・テスト仕様・学習ノート |
| 直下の設定ファイル | ビルド・スタイル・型チェックの設定 |

## 3. ファイル別の詳細

### 3-1. `app/`(Next.js の入り口)

| ファイル | 役割 | 読むポイント |
| --- | --- | --- |
| `app/layout.tsx`(約15行) | 全ページ共通の枠。`<html lang="ja">`、タイトル、全体のスタイル | サーバー側で動くコンポーネント(`'use client'` なし) |
| `app/page.tsx`(177行) | **画面全体の司令塔**。`Home`(ログインの枠)と `WorkoutApp`(本体) | 下の「page.tsx の読み方」を参照 |
| `app/globals.css` | Tailwind の読み込み、フォント、数値入力の矢印の非表示 | |

**`app/page.tsx` の読み方**
- `Home`(:17): `AuthGate` で包んで、ログイン済みのときだけ `WorkoutApp` を出す。
- `WorkoutApp`(:25):
  - `useData()` で全データと操作の関数を受け取る(:27 付近)。
  - 「どのビューを出すか」(`view`)と「どのワークアウト・計画を選んでいるか」の状態を持つ。
  - 新規作成・削除のハンドラを作り、部品に渡す。
  - 最後に、`view` に応じて、`WorkoutDetail` / `PlansView` / `ExercisesView` / `ProgressView` のどれかを出す。
- **事実**: 画面の切り替えは、URL ではなく、`view` という状態で行っています(1ページのアプリ)。

### 3-2. `lib/`(データ層)

| ファイル | 行数 | 役割 |
| --- | --- | --- |
| `lib/types.ts` | 88 | **型の定義元**。`Workout`、`Exercise`、`WorkoutSet`、`TrainingPlan`、`ExerciseMaster`、進捗用の型など |
| `lib/supabase.ts` | 8 | Supabase クライアントの生成。環境変数が未設定なら `null` |
| `lib/db.ts` | 260 | **DB との通信を集約**。取得(`fetch*`)、保存(`save*`)、削除(`delete*`)、種目の追加・更新、進捗の取得 |
| `lib/useData.ts` | 230 | **データ管理と自動保存**のフック。画面から見たときの「データの窓口」 |
| `lib/exercises.ts` | 32 | 部位の一覧(`PARTS`)、使用中の種目の判定(`usedExerciseIds`)、名前での検索(`findByName`) |
| `lib/utils.ts` | 97 | ID 生成(`uid`)、新規データの雛形(`createWorkout` など)、日付の整形・計算 |

**`lib/types.ts`**
- 画面で使う「データの形」です。DB の表とは、名前や形が少し違います(例: DB は `is_active`、型は `isActive`)。この変換は `db.ts` が行います。
- 最初に読むと、アプリで扱うデータの全体が分かります。

**`lib/db.ts`**
- 構成: 種目(:38〜) → ワークアウト(:65〜) → 計画(:131〜) → 進捗(:207〜)。
- 取得は、入れ子で1回で取れます(`WORKOUT_SELECT`、:80)。DB の行を、画面用の形に変換(`fetchWorkouts`、:83)。
- 保存は、**SQL 関数を呼ぶだけ**(`saveWorkout`:108、`savePlan`:179)。複数テーブルの書き込みは、SQL 側が行います。
- **事実**: コンポーネントが Supabase を直接呼ばないように、ここに集約してあります(`AGENTS.md` のルール)。

**`lib/useData.ts`**
- `useData()`(:25)が返すもの: データ本体、保存の状態(`saveStatus`)、通知(`notice`)、操作の関数(`addWorkout`、`updateWorkout`、`removeWorkout` など)。
- 内部の仕組み:
  - `dirty`(保存が必要なものの一覧)、`timer`(1秒のタイマー)、`queue`(書き込みの順番待ち)、`dataRef`(最新のデータ)。
  - `markDirty`(:90)→ `flush`(:62)で、自動保存。
- **最も読み応えがあるファイルです。** 第1回の学習の中心です。

**`lib/exercises.ts` / `lib/utils.ts`**
- 小さな関数の集まりです。1つずつ、独立して読めます。
- `utils.ts` の `toDateString`(:73)は、日付を**ローカル時間**で文字にします(UTC だと、日本で前日になるため)。

### 3-3. `components/`(画面の部品)

| ファイル | 行数 | 役割 | 受け取るもの(props)の例 |
| --- | --- | --- | --- |
| `AuthGate.tsx` | 122 | ログイン状態の確認。未ログインならログイン画面、未設定なら案内画面 | `children`(ログイン後に出すもの) |
| `Sidebar.tsx` | 224 | 左のメニュー。ビューの切り替え、ワークアウト・計画の一覧、保存状態、ログアウト | `view`、`workouts`、`saveStatus` など多数 |
| `EmptyState.tsx` | 24 | ワークアウトが0件のときの案内 | `onNew` |
| `WorkoutDetail.tsx` | 184 | **ワークアウト1件の編集画面**。タイトル、日付、絵文字、メモ、種目の並び | `workout`、`onChange`、`masters` |
| `ExerciseBlock.tsx` | 215 | **種目1つ分**(種目の選択、セットの表)。内部に `SetRow`(セット1行)を持つ | `exercise`、`onChange`、`masters` |
| `ExercisePicker.tsx` | 111 | 種目の選択(部位別の一覧と、その場で追加) | `exerciseId`、`masters`、`onSelect`、`onCreate` |
| `PlansView.tsx` | 270 | 計画の編集。内部に `DaySection`(1日分)、`ExerciseRow`(種目1行) | `plan`、`onChange`、`masters` |
| `ExercisesView.tsx` | 162 | 種目マスタの管理画面。追加、名前・部位の変更、削除 | `masters`、`usedIds`、`onCreate` など |
| `ProgressView.tsx` | 220 | 進捗の画面。部位別の週間ボリューム、種目別の一覧と推移 | `workouts`、`saveStatus` |

**部品の親子関係(ワークアウト編集の場合)**

```
WorkoutDetail(ワークアウト1件)
 └─ ExerciseBlock(種目1つ)  × 種目の数
      ├─ ExercisePicker(種目の選択)
      └─ SetRow(セット1行)  × セットの数
```

- **共通の考え方**: 部品は、データを自分で持たず、`props` で受け取り、変更があれば `onChange` で、**上に伝えます**。
  - 例: 重量を入力 → `SetRow` → `ExerciseBlock` → `WorkoutDetail` → `page.tsx` → `useData.updateWorkout`。
- **`ProgressView` だけは例外**: 読み取り専用なので、`useData` を通さず、`db.ts` の関数を直接呼んでいます(推測: 保存が絡まないため)。この点は、設計が揃っていない部分です。

### 3-4. `supabase/migrations/`(DB の定義)

| ファイル | 内容 | 状態 |
| --- | --- | --- |
| `0001_init.sql` | 旧版の `documents` 表(JSON を1枚の表に保存) | 旧データの元として残している |
| `0002_normalized_schema.sql` | 新しい7つの表、権限(RLS)、初期種目、保存関数 `save_workout` / `save_plan`、ビュー `v_set_facts` | **現在の DB の中心** |
| `0003_migrate_documents.sql` | 旧 `documents` から新しい表への移行(1回だけ) | 実行済み |
| `0004_progress_views.sql` | 進捗用の集計ビュー(`v_part_weekly` など) | **進捗画面が使う** |

- 表の構造と関係は、`docs/design/03_database-design.md` に図があります。

### 3-4. `analysis/`(Python)
- `fetch_data.py`: ログインしてデータを CSV に保存。`analyze.py`: 集計とグラフ。`make_sample.py`: 架空のサンプル。`test_*.py`: テスト。
- 使い方は `analysis/README.md` にあります。アプリ本体とは、つながっていません。

### 3-5. 設定ファイル

| ファイル | 役割 |
| --- | --- |
| `package.json` | 使うライブラリと、起動コマンド(`npm run dev` など) |
| `tsconfig.json` | TypeScript の設定。`@/` は、プロジェクトの直下を指す別名(例: `@/lib/db`) |
| `next.config.js` | Next.js の設定(今は空) |
| `tailwind.config.ts` / `postcss.config.js` | Tailwind CSS(スタイルの書き方)の設定 |
| `.env.example` | 環境変数の見本。実際の値は、`.env.local`(Git には入れない) |

## 4. 依存関係(誰が誰を呼ぶか)

- `app/page.tsx` → `components/*`、`lib/useData`、`lib/utils`、`lib/exercises`
- `components/*` → `lib/types`、`lib/utils`、`lib/exercises`(`ProgressView` だけ `lib/db` も)
- `lib/useData.ts` → `lib/db`、`lib/exercises`
- `lib/db.ts` → `lib/supabase`
- **事実**: `lib/` のファイルは、`components/` を呼びません(下の層が、上を知らない)。

## 5. おすすめの読む順番(ボトムアップ)

1. `lib/types.ts`(データの形。ここが分かると、全体が見える)
2. `lib/utils.ts`、`lib/exercises.ts`(小さな関数)
3. `supabase/migrations/0002_…sql` の「表の定義」部分(データが、どう保存されるか)
4. `lib/db.ts`(DB との通信)
5. `lib/useData.ts`(自動保存)← 第1回の中心
6. `components/ExerciseBlock.tsx` → `WorkoutDetail.tsx`(入力の部品)
7. `app/page.tsx`(全体のつなぎ)
8. `components/ProgressView.tsx`、`0004_…sql`(集計)

## 6. 用語メモ

| 言葉 | 意味 |
| --- | --- |
| コンポーネント | 画面の部品(関数として書く)。`<Sidebar />` のように使う |
| props | 親から子へ渡す値や関数 |
| state(状態) | 部品が覚えている値。変わると画面が再描画される(`useState`) |
| フック(`useXxx`) | React の機能を使う関数。`useData` は、自作のフック |
| `useRef` | 再描画を起こさずに値を覚える箱。タイマーや最新データの保持に使う |
| `useEffect` | 画面の表示後に、副作用(通信・タイマー)を行う |
| `'use client'` | ブラウザ側で動く部品の印(状態や操作を使うため) |
| RLS | DB が、行ごとに「誰が見られるか」を決める仕組み |
| RPC(`rpc`) | DB の関数を、ブラウザから呼ぶこと(`save_workout`) |
| anon key | 公開してよい鍵。権限の制限は、RLS が担う |
