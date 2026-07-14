# Website Monitor - Vercel Edition

お気に入りサイトの更新状況を監視するダッシュボードアプリケーション

## 🌟 機能

- **サイト一覧表示** - 名前・URL・最終チェック時刻・ステータス
- **URL追加/削除** - 簡単な管理画面
- **15分間隔自動監視** - Vercel Cron Jobsによる定期チェック
- **色付きステータスバッジ** - 🟢新規更新 / ⚪️未更新 / 🔴エラー / ⏳待機中
- **手動チェック機能** - いつでも即座にチェック可能
- **レスポンシブデザイン** - スマホ・タブレット対応

## 🚀 技術スタック

- **フロントエンド**: Next.js 14 + React 18 + TypeScript + Tailwind CSS
- **バックエンド**: Vercel Serverless Functions
- **データベース**: Neon PostgreSQL（無料）
- **定期処理**: Vercel Cron Jobs（15分間隔）
- **デプロイ**: Vercel

## 📦 デプロイ手順

### 1. Neonデータベース設定
1. [Neon](https://neon.tech)でアカウント作成
2. 新プロジェクト作成（PostgreSQL 17、シンガポールリージョン推奨）
3. `DATABASE_URL`を取得

### 2. Vercelデプロイ
1. GitHubにプッシュ
2. [Vercel](https://vercel.com)でプロジェクトをインポート
3. 環境変数を設定：
   - `DATABASE_URL`: Neonから取得した接続文字列

### 3. 動作確認
- サイト追加/削除機能
- 手動チェック機能
- 15分後に自動監視開始

## 🔧 ローカル開発

```bash
# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env.local
# .env.localにDATABASE_URLを設定

# 開発サーバー起動
npm run dev
```

## 📈 監視の仕組み

1. **コンテンツハッシュ比較** - ページ全体のSHA256ハッシュを計算
2. **変更検知** - 前回のハッシュと比較して更新を判定
3. **エラーハンドリング** - タイムアウト・接続エラー等を適切に処理
4. **自動復旧** - 一時的なエラーから自動回復

## 🌐 アクセス

- **本番環境**: https://your-project.vercel.app
- **ローカル**: http://localhost:3000

## 📱 モバイル対応

完全レスポンシブデザインで、スマートフォンやタブレットからも快適に利用できます。

## 🔒 セキュリティ

- **HTTPS強制** - Vercelにより自動適用
- **環境変数保護** - データベース認証情報は暗号化保存
- **CORS設定** - 適切なオリジン制限

## 📊 制限事項

- **無料プラン制限**:
  - Neon: 3GB、10万行まで
  - Vercel: 月100GB転送量まで
- **監視間隔**: 15分（Vercel Cron Jobsの制限）
- **同時監視**: 実用的な範囲（~50サイト推奨）

## ⏰ Vercel Cron の設定

自動監視は `vercel.json` の `crons` 設定で動作します。

- **現在の設定（全プランで動作する安全な設定）**: `"schedule": "0 21 * * *"`
  - 毎日 21:00 UTC（日本時間 朝6:00）に1回実行
  - Vercel **Hobby（無料）プランは cron の実行が1日1回まで**という制限があるため、この設定にしています
- **Pro プランの場合（15分間隔の例）**: `"schedule": "*/15 * * * *"` に変更すると15分間隔で実行できます

### CRON_SECRET（本番では必須）

本番環境（`NODE_ENV=production`）では、環境変数 `CRON_SECRET` の設定が**必須**です。
未設定の場合、`/api/cron` は処理を実行せず設定エラー（500）を返します。

Vercel のプロジェクト設定で `CRON_SECRET` を追加すると、Vercel Cron はリクエストに
`Authorization: Bearer <CRON_SECRET>` ヘッダーを自動で付与し、`/api/cron` 側で照合されます。
値はランダムな長い文字列を各自で生成してください（例: `openssl rand -hex 32`）。

### ローカル開発での動作確認

ローカル（`npm run dev`）では `CRON_SECRET` は任意です。

```bash
# .env.local に CRON_SECRET を設定していない場合（そのまま実行可能）
curl http://localhost:3000/api/cron

# .env.local に CRON_SECRET を設定している場合（同じ値をヘッダーに付ける）
curl -H "Authorization: Bearer <自分で設定した値>" http://localhost:3000/api/cron
```

正しく動作すると `{"message":"Website monitoring completed",...}` が返ります。
ヘッダーが一致しない場合は 401 が返ります。

## 🛠️ カスタマイズ

- **監視間隔変更**: `vercel.json`のcronスケジュール修正（上記「Vercel Cron の設定」参照）
- **デザイン変更**: Tailwind CSSクラス修正
- **通知機能追加**: Webhook等で外部連携可能

## ❓ トラブルシューティング

### よくある問題
1. **データベース接続エラー**: DATABASE_URLを確認
2. **Cron Job未実行**: Vercel Proプラン必要（無料でも制限付き実行）
3. **タイムアウトエラー**: 対象サイトの応答速度確認

## 📝 ライセンス

MIT License

---

🎉 **完全無料で使える本格的なWebサイト監視ツール**です！