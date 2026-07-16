# Website Monitor - Vercel Edition

お気に入りサイトの更新状況を監視するダッシュボードアプリケーション

## 🌟 機能

- **サイト一覧表示** - 名前・URL・最終チェック時刻・ステータス
- **URL追加/削除** - 簡単な管理画面
- **30分間隔自動監視** - GitHub Actionsによる定期チェック（Vercel Cronは日次の予備）
- **色付きステータスバッジ** - 🟢新規更新 / ⚪️未更新 / 🔴エラー / ⏳待機中
- **手動チェック機能** - いつでも即座にチェック可能
- **レスポンシブデザイン** - スマホ・タブレット対応

## 🚀 技術スタック

- **フロントエンド**: Next.js 14 + React 18 + TypeScript + Tailwind CSS
- **バックエンド**: Vercel Serverless Functions
- **データベース**: Neon PostgreSQL（無料）
- **定期処理**: GitHub Actions（30分間隔）＋ Vercel Cron Jobs（日次・予備）
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
- GitHub Actions の30分間隔実行で自動監視開始（下記「定期監視の仕組み」参照）

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
- **監視間隔**: 30分（GitHub Actions。スケジュール実行は数分遅延することがある）
- **同時監視**: 実用的な範囲（~50サイト推奨）

## ⏰ 定期監視の仕組み

定期監視は2系統で動作します。**ページ（ダッシュボード）を開くだけでは監視処理は実行されません**
（画面はサイト一覧の表示を更新するだけで、チェックは「全自動チェック」ボタンを押したときのみ実行されます）。

| 系統 | 間隔 | 役割 |
|---|---|---|
| **GitHub Actions**（`.github/workflows/website-monitor.yml`） | **30分ごと** | 通常の定期監視（本番APIの `/api/cron` を呼び出す） |
| **Vercel Cron**（`vercel.json`） | 毎日 21:00 UTC（日本時間 朝6:00） | 予備。Vercel **Hobby（無料）プランは cron 実行が1日1回まで**のため日次のみ |

- GitHub Actions を使うには、リポジトリの **Settings > Secrets and variables > Actions** に
  Repository Secret **`CRON_SECRET`** の登録が必要です
- **Vercel と GitHub には同じ `CRON_SECRET` の値を設定してください**（値が異なると401になります）
- GitHub の Actions タブ →「Website Monitor Cron」→「Run workflow」で手動実行もできます
- Vercel Pro プランに移行した場合は、`vercel.json` を `"schedule": "*/15 * * * *"` 等に変更して
  Vercel Cron だけで運用することもできます

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