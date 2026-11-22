# 技術選定

使用技術は `package.json` / `mobile/package.json` から確認した**事実**です。
「選定理由」「他の選択肢」「メリット・デメリット」は、一般的な知識に基づく**推測**です(当時の判断記録がないため)。実際の理由と違えば修正してください。

| 技術 | バージョン(事実) | 用途 |
| --- | --- | --- |
| Next.js (App Router) | 14.2.5 | Web 版 |
| React | 18(Web)/ 19.2.3(モバイル) | UI |
| TypeScript | 5(Web)/ 6.0.3(モバイル) | 型 |
| Tailwind CSS | 3.4 | Web のスタイル |
| lucide-react | 0.436 | Web のアイコン |
| Expo / React Native | Expo ~57 / RN 0.86 | モバイル版 |
| AsyncStorage | 2.2 | モバイルのローカル保存 |
| Supabase(`supabase-js` 2.x) | - | 認証・DB・リアルタイム |

## 各技術の整理(推測を含む)

### Next.js + React + TypeScript(Web)
- **選定理由(推測)**: React の学習になり、Vercel へのデプロイが簡単。TypeScript で型を共通化できる。
- **他の選択肢**: Vite + React(より軽量)。
- **メリット**: ルーティング・ビルドが整っている。 **デメリット**: 現状は 1 ページ構成で、Next.js の機能は活かしきれていない。
- **コスト**: 無料(Vercel の無料枠でデプロイ可能)。

### Expo / React Native(モバイル)
- **選定理由(推測)**: React の知識と TypeScript の型をそのまま流用でき、`shared/` を Web と共有できる。
- **他の選択肢**: PWA 化(ストア不要で手軽)、Flutter、ネイティブ。
- **メリット**: iOS / Android を 1 コードで。Expo Go ですぐ試せる。 **デメリット**: ストア配布には Apple Developer Program(有料)などが必要になる(要確認)。

### Supabase(認証・PostgreSQL・Realtime)
- **選定理由(推測)**: 認証・DB・変更通知が 1 つで揃い、バックエンドを自作せずに済む。PostgreSQL は方針書の基本候補。
- **他の選択肢**: Neon + 自作 API、Google Cloud SQL + Cloud Run、Firebase。
- **メリット**: 無料枠で始められる。RLS でデータ保護できる。 **デメリット**: 無料プランには制限があり、一定期間使わないとプロジェクトが停止する場合がある(最新の条件は要確認)。
- **コスト**: 無料枠内で運用中かは要確認。

### JSON ドキュメント方式の保存
- 詳細は `01_architecture.md` と `03_database-design.md` を参照。ADR にする価値がある判断。

## 技術的制約
- Web とモバイルで React のメジャーバージョンが異なる(18 / 19)。`shared/` は両方で動く書き方にする必要がある。
- `shared/` に Web 専用(DOM など)・モバイル専用の API を持ち込めない。
