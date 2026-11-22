# ADR: 簡素化の再設計(Web のみ・オンライン前提・DB 正規化)

状態: **提案(承認待ち)。未実装。** 末尾の「要確認」が決まったら実装に進む。

## 1. 決定済み(開発者の回答)

- モバイル版(Expo)は削除する → **実施済み**(`6bbec33`)
- オフライン編集と複数端末の同期はやめ、**オンライン前提**にする(サーバーが正)
- DB は JSON 1 枚方式をやめ、**テーブルを分ける(正規化)**

## 2. 背景(現状の負債)

事実:
- 同期の仕組み(`shared/sync.ts` 268 行、`shared/useAppData.ts` 219 行)に、3 点比較・スナップショット・再試行・リアルタイム購読が集中している。
- `documents` 1 枚に JSON を保存しており、DB は中身を検証できず、集計は SQL で書けない。
- 自動テストは 0 件。

推測:
- 複雑さの大半は「オフライン編集 + 複数端末」を両立させるために生まれている。これをやめれば、同期処理を丸ごと削除できる。
- 部位別・種目別の集計(と Python での分析)は、正規化したテーブルのほうが自然に書ける。

## 3. 新しい DB 設計

```
auth.users
  ├─ exercises          種目マスタ(user_id が NULL の行 = 初期種目)
  ├─ workouts           ワークアウト
  │    └─ workout_exercises   ワークアウト内の種目(exercises を参照)
  │         └─ workout_sets   セット
  └─ plans              トレーニング計画
       └─ plan_days
            └─ plan_exercises (exercises を参照)
```

### 主な方針

- 主キーは `uuid`。子テーブルは親に `on delete cascade`(ワークアウトを消せば、種目・セットも消える)。
- 種目への参照は **`on delete restrict`**。「記録で使われている種目は削除できない」を、**DB 自身が保証する**(アプリ側の判定が不要になる)。
- 日付は `date` 型(文字列ではなく)。
- 並び順は `position`(整数)列で持つ。
- 部位は `text` + CHECK 制約(`shoulder` / `chest` / `arm` / `abs` / `back` / `leg` / `unclassified`)。
- 各テーブルに `user_id`(`default auth.uid()`)を持たせ、RLS は「`user_id = auth.uid()` の行だけ」という同じ形に統一する。
- 初期種目は **DB の行(`user_id` が NULL)** にする。全ユーザーが読め、書き換えはできない。
  - 変更点: 以前の設計では「初期種目はコード内」だった。DB に置くと、集計 SQL や Python から部位・種目名を結合できる。

### テーブル定義(案)

| テーブル | 主なカラム |
| --- | --- |
| `exercises` | `id`, `user_id`(NULL=初期), `name`, `part`, `created_at`。名前は(ユーザー内で)大文字小文字を区別せず一意 |
| `workouts` | `id`, `user_id`, `title`, `date`, `emoji`, `notes`, `created_at` |
| `workout_exercises` | `id`, `user_id`, `workout_id`, `exercise_id`(restrict), `position` |
| `workout_sets` | `id`, `user_id`, `workout_exercise_id`, `position`, `weight`, `reps`, `unit`(kg/lbs), `completed` |
| `plans` | `id`, `user_id`, `name`, `emoji`, `description`, `frequency`, `is_active`, `created_at` |
| `plan_days` | `id`, `user_id`, `plan_id`, `label`, `position` |
| `plan_exercises` | `id`, `user_id`, `plan_day_id`, `exercise_id`(restrict), `position`, `sets`, `reps`, `weight` |

### 集計用ビュー

`workout_sets` を `workout_exercises`・`exercises`・`workouts` と結合した 1 本のビュー(`v_set_facts`:日付・部位・種目・重量・回数・完了)を用意する。
進捗画面も Python の分析スクリプトも、このビューを読むだけで部位別・種目別に集計できる。

## 4. アプリ側の構成

| 項目 | 現状 | 変更後 |
| --- | --- | --- |
| データ取得・保存 | `useAppData` + `SyncEngine`(ローカルキャッシュ・3 点比較) | サーバーを直接読み書きする薄いデータ層(`lib/db.ts` など) |
| リアルタイム購読・再試行・スナップショット | あり | **削除** |
| ローカルモード(Supabase 未設定) | あり | **削除**(ログイン必須)。`lib/storage.ts` の旧データ引き継ぎも削除 |
| 種目マスタの取り込み(`linkExercises`) | クライアントで自動実行 | **削除**(移行は SQL で 1 回だけ実行) |
| `shared/` | 同期・型・ユーティリティ | 型とユーティリティのみに縮小(必要なら `lib/` へ統合) |

### 保存方式(要確認の論点)

記録は文字入力のたびに更新される。次の 2 案がある。

- **案 1(推奨): 画面の状態を持ち、少し間をおいて 1 回で保存する**。ワークアウト 1 件(種目・セットを含む)を、**1 つの SQL 関数(RPC)で丸ごと保存**する。1 回の通信で完結し、途中で失敗しても中途半端な状態が残らない(トランザクション)。
- 案 2: 「保存」ボタンを押したときだけ保存する。実装は単純だが、押し忘れで失われる。

## 5. 既存データの移行

- 現在の `documents`(JSON)から、新テーブルへ **SQL で 1 回だけ**変換して取り込む。
  - `documents` は、新しい構成の動作確認が済むまで**削除せず残す**(バックアップ)。
- 種目: `custom:` で始まる ID の種目(自由入力から取り込んだもの)を、`exercises` に未分類(`unclassified`)で登録する。
- 名前が空の種目行(未選択のまま残っているもの)は、移行時に**捨てる**。
- 移行の手順と SQL は、実装時に作成し、**空のテスト用 DB で先に動作確認**してから案内する。

## 6. 影響・リスク

- **既存データが対象の DB 変更**なので、実行前にバックアップ(`documents` 残置)と、移行 SQL の検証が必要。
- 新旧の切り替え時は、アプリのコードと DB が一致している必要がある(DB を先に変えると旧アプリは動かない)。
- 実装後に作り直すもの: `docs/` の構成・DB・要件・テスト仕様、README。

## 7. 作業の順序(案)

1. 新テーブル・RLS・初期種目・ビューの SQL(`0004`)を作成し、ローカルの空の PostgreSQL で検証
2. `documents` → 新テーブルの移行 SQL(`0005`)を作成・検証
3. データ層を作り、Web の各画面を新データ層に切り替え(記録 → 計画 → 種目 → 進捗の順)
4. 同期エンジン・旧フック・ローカルモード・取り込み処理を削除
5. 進捗を `v_set_facts` ベースの部位別・種目別に作り直す
6. ドキュメントを更新

## 8. 要確認

1. **ログイン必須(ローカルモード廃止)** でよいか。
2. **初期種目を DB の行にする**(コード内から変更)でよいか。
3. **保存方式**は案 1(まとめて保存する SQL 関数)でよいか。
4. **名前が空の種目行は移行時に捨てる**でよいか。
