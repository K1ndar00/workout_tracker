# データベース設計

状態: `supabase/migrations/0002_normalized_schema.sql` と `0004_progress_views.sql` の内容(ローカルの PostgreSQL で検証済み)。経緯は `06_redesign-adr.md`。

## 1. ER 図

```
auth.users
  ├─ exercises (user_id が NULL = 初期種目)
  ├─ workouts ─ workout_exercises ─ workout_sets
  │                  └──(exercise_id)──► exercises   ※削除制限あり
  └─ plans ─ plan_days ─ plan_exercises
                           └──(exercise_id)──► exercises   ※削除制限あり
```

## 2. テーブル

| テーブル | 主なカラム | 備考 |
| --- | --- | --- |
| `exercises` | `id`, `user_id`, `name`, `part`, `created_at` | `part` は `shoulder/chest/arm/abs/back/leg/unclassified`。同じ名前(大文字小文字・前後の空白を無視)は 1 ユーザーにつき 1 つ |
| `workouts` | `id`, `user_id`, `title`, `date`(date 型), `emoji`, `notes`, `created_at` | 一覧用に `(user_id, date desc)` のインデックス |
| `workout_exercises` | `id`, `user_id`, `workout_id`, `exercise_id`, `position` | ワークアウト内の種目と並び順 |
| `workout_sets` | `id`, `user_id`, `workout_exercise_id`, `position`, `weight`, `reps`, `unit`, `completed` | `unit` は `kg/lbs`。`weight`・`reps` は 0 以上 |
| `plans` | `id`, `user_id`, `name`, `emoji`, `description`, `frequency`(1〜7), `is_active`, `created_at` | |
| `plan_days` | `id`, `user_id`, `plan_id`, `label`, `position` | |
| `plan_exercises` | `id`, `user_id`, `plan_day_id`, `exercise_id`, `position`, `sets`, `reps`(text), `weight` | |

- 主キーは `uuid`。外部キーにはインデックスを付けている。
- 子 → 親は `on delete cascade`(ワークアウトを消せば、種目・セットも消える)。
- **種目への参照だけ `on delete restrict`**: 記録・計画で使われている種目は、DB が削除を拒否する(エラーコード 23503)。
- 初期種目(30 件)は `user_id` が NULL の行として登録済み。ID は名前から決まる固定値。

## 3. セキュリティ(RLS)

- 全テーブルで RLS を有効化。
- `exercises`: 読み取りは「初期種目 or 自分の種目」、追加・更新・削除は自分の種目だけ(初期種目は変更不可)。
- その他: `user_id = auth.uid()` の行だけ読み書きできる(1 本のポリシー)。
- 検証した内容: 他ユーザーの行が見えない / 他人の `user_id` で追加できない / 他人のワークアウトを `save_workout` で上書きできない / 未ログインでは何も見えない。

## 4. SQL 関数とビュー

- `save_workout(p jsonb)`: ワークアウト 1 件(種目・セット込み)を 1 トランザクションで保存。JSON に含まれない種目・セットは削除する。呼び出し側の権限で動く(`security invoker`)ため RLS が効く。
- `save_plan(p jsonb)`: 計画(日・種目込み)について同様。
- `v_set_facts`(ビュー): セットごとに 日付・部位・種目・重量・回数・ボリューム(kg 換算を含む)を持つ平らな表。Python 分析でも使える。
- 進捗用の集計ビュー(`0004_progress_views.sql`)。いずれも「完了」のセットだけを集計し、lbs は kg に換算する。
  - `v_part_weekly`: 部位 × 週(月曜始まり)のセット数・ボリューム・ワークアウト数
  - `v_exercise_daily`: 種目 × 日のセット数・回数・ボリューム・最大重量
  - `v_exercise_summary`: 種目ごとの実施日数・合計ボリューム・最大重量・最終日
  - すべて RLS が効く(`security_invoker`)。
- なぜビューで集計するか: Supabase の API は 1 回の取得が最大 1,000 行までのため、セットを全部取ってクライアントで集計すると、データが増えたときに黙って切り捨てられる。集計済みの行(部位数 × 週数、種目数)だけを取得する。

## 5. 旧データの移行(`0003_migrate_documents.sql`)

- 旧 `documents`(JSON)から新テーブルへ 1 回だけ変換する。何度実行しても重複しない。`documents` は変更・削除しない。
- 種目名が初期種目と一致 → 初期種目に紐づけ。それ以外 → ユーザーの種目(部位は「未分類」)。名前が空の種目行は捨てる。
- 栄養・設定のデータは移行しない。

## 6. 注意点

- 旧 `documents` テーブルは移行後も残る。動作確認後に削除してよい(未実施)。
- 新規セットアップ(旧データなし)では `0002` だけ実行すればよい(`0003` は `documents` が必要)。
