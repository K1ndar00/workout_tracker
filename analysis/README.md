# 分析スクリプト(Python)

アプリに記録したデータを、pandas で分析するための**アプリ本体とは独立した**スクリプトです。
Supabase からデータを読むだけで、書き込みはしません。

| ファイル | 役割 |
| --- | --- |
| `fetch_data.py` | ログインして、完了したセットを `data/sets.csv` に保存する |
| `analyze.py` | CSV を読み、集計してレポートを表示し、グラフを `output/` に保存する |
| `make_sample.py` | 動作確認用の**架空の**サンプルデータ(`sample/sets.csv`)を作る |
| `test_*.py` | テスト(`pytest`) |

## セットアップ

```bash
cd analysis
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## 使い方

### まずサンプルデータで試す(Supabase 不要)

```bash
python analyze.py --csv sample/sets.csv
```

### 自分のデータで分析する

```bash
cp .env.example .env               # URL・anon key・メールアドレスを記入(.env は Git に入らない)
python fetch_data.py               # パスワードは .env に書かず、実行時に聞かれる入力でもよい
python analyze.py
```

`analyze.py` の主なオプション: `--csv`(読む CSV)、`--out`(グラフの出力先)、`--today YYYY-MM-DD`(基準日)、`--no-charts`

## 出力される内容

- 週ごとのトレーニング日数(休んだ週は 0)
- 直近4週の部位別ボリュームの割合
- 部位ごとの「最後に鍛えてからの日数」(放置している部位が分かる)
- 自己ベスト更新の履歴
- グラフ: 部位別の週間ボリューム(積み上げ)、種目別の推定1RMの推移

## 集計のルール・注意点

- 「完了」にしたセットだけが対象です。重量は kg に換算済みです(lbs は 0.45359237 倍)。
- ボリューム = 重量 × 回数。**自重の種目(重量 0)は 0 になります**(例: 腕立て伏せ、プランク)。
- 推定1RM は Epley の式 `重量 × (1 + 回数 / 30)` です。目安であり、実測ではありません。
- 週は月曜始まりです(Web アプリと同じ)。

## 仕組みとセキュリティ

- `fetch_data.py` は、アプリと同じメールアドレス・パスワードでログインし、公開の anon key で通信します。
  **データベースのパスワードやサービスキーは使いません。** そのため Row Level Security が効き、自分のデータしか取得できません。
- 取得は `v_set_facts` ビュー(`supabase/migrations/0002`・`0004`)を 1,000 行ずつ読みます(Supabase の 1 回の上限)。
- `.env`、`data/`(自分の記録)、`output/` は `.gitignore` で除外してあります。コミットしないでください。
