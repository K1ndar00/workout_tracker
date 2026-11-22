# データベース設計

出典: `supabase/migrations/0001_init.sql`、`shared/types.ts`、`shared/sync.ts`(コミット `c2c9359` 時点)。

## 1. 方針(事実)

- テーブルは `public.documents` の **1 枚のみ**。
- ワークアウト・計画を、すべて `collection` 列で区別して JSON(`jsonb`)で保存する。
- 1 行 = 1 ドキュメント = 1 ユーザーのデータ 1 件。

## 2. ER 図

```
auth.users (Supabase 管理)
   │ 1
   │
   │ N   on delete cascade
documents
```

ユーザーを削除すると、そのユーザーの `documents` も自動で削除される。

## 3. テーブル: `public.documents`

| カラム | 型 | NULL | デフォルト | 説明 |
| --- | --- | --- | --- | --- |
| `user_id` | uuid | 不可 | `auth.uid()` | 所有者。`auth.users(id)` への外部キー(`on delete cascade`) |
| `collection` | text | 不可 | - | 種類。`workouts` / `plans` / `exercises` のみ(CHECK 制約。0002・0003 適用後) |
| `key` | text | 不可 | - | ドキュメント ID(下表) |
| `data` | jsonb | 不可 | - | ドキュメント本体 |
| `updated_at` | timestamptz | 不可 | `now()` | 更新日時。更新時にトリガーで自動更新 |

- **主キー**: `(user_id, collection, key)`
- **インデックス**: 主キーのみ(`user_id` で始まるため、ユーザー単位の取得に効く。※効くかどうかは推測であり、実測はしていない)

> 注: 0001 では `nutrition` / `settings` も許可していた。栄養管理の削除に伴い、`0002_remove_nutrition.sql` でそれらの行の削除と CHECK 制約の変更を行う(**開発者が手動実行。未実行の間は旧データが残る**)。

### `key` の中身

| collection | key | `data` の型(`shared/types.ts`) |
| --- | --- | --- |
| `workouts` | ワークアウトの `id` | `Workout`(タイトル・日付・種目・セット・メモなど) |
| `plans` | 計画の `id` | `TrainingPlan`(名前・曜日ごとの種目・有効フラグなど) |
| `exercises` | 種目の `id` | `ExerciseMaster`(ユーザーが追加した種目。初期種目はコード内で保存しない。詳細は `05_exercise-master.md`) |


## 4. セキュリティ(RLS)

Row Level Security は有効。ポリシーは 4 つで、すべて「自分の行だけ」。

| ポリシー | 操作 | 条件 |
| --- | --- | --- |
| `documents_select_own` | SELECT | `auth.uid() = user_id` |
| `documents_insert_own` | INSERT | `auth.uid() = user_id` |
| `documents_update_own` | UPDATE | `auth.uid() = user_id`(更新後も同条件) |
| `documents_delete_own` | DELETE | `auth.uid() = user_id` |

- anon key は公開される前提のため、**アクセス制御は RLS が担う**。
- `user_id` のデフォルトが `auth.uid()` なので、通常はクライアントが他人の ID を指定できない(INSERT の `with check` でも拒否される)。

## 5. トリガー・Realtime

- `documents_touch_updated_at`: UPDATE のたびに `updated_at = now()` にする。
- `supabase_realtime` publication に `documents` を追加済み。端末間の変更通知に使う。

## 6. 設計上の注意点

事実:

- `data` の中身(JSON の形)は **DB では検証されない**。型の保証はクライアント側の TypeScript だけ。
- `updated_at` はあるが、競合判定には**使われていない**(同期は JSON 文字列の比較による。`shared/sync.ts`)。

推測:

- 構造が単純で個人利用規模には十分。ただし、期間集計や種目別の検索を DB 側でしたくなったら、テーブル分割(正規化)を検討する。
- 将来 JSON の形を変える場合は、古い形式のデータが残るため、クライアント側での読み替え(マイグレーション処理)が必要になる。

## 7. 今後の確認事項

- 本番の Supabase 上のテーブル・ポリシーが、このマイグレーションと一致しているか(今回は SQL ファイルのみ確認。実環境は未確認)。
