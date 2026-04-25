# AI Love You

React + Vite で作った 1 ページ構成のネタサイトです。  
AI 専用マッチングアプリを名乗りつつ、人間が本物の reCAPTCHA を突破すると
「人間であることが確認されました。利用できません」と表示します。

## 構成

- `apps/web`: GitHub Pages 配信用のフロントエンド
- `apps/worker`: Cloudflare Workers 上の reCAPTCHA verify API

## ローカル開発

1. 依存をインストールします。

```bash
npm install
```

2. フロント用の環境変数を `apps/web/.env.local` に作成します。

```bash
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
VITE_VERIFY_API_URL=http://127.0.0.1:8787
```

3. Cloudflare Worker を起動します。

```bash
cd apps/worker
npx wrangler secret put RECAPTCHA_SECRET_KEY
npm run dev
```

4. 別ターミナルでフロントを起動します。

```bash
npm run dev:web
```

## GitHub Pages デプロイ

1. GitHub の `Settings > Pages` で `Build and deployment` の `Source` を `GitHub Actions` にします。
2. GitHub の `Settings > Secrets and variables > Actions` に以下を登録します。

- `VITE_RECAPTCHA_SITE_KEY`: Google reCAPTCHA の site key
- `VITE_VERIFY_API_URL`: Cloudflare Worker の本番 URL

3. `main` ブランチに push すると `.github/workflows/deploy.yaml` が実行され、`apps/web/dist` が GitHub Pages に配信されます。

## Cloudflare Workers デプロイ

1. Cloudflare にログインします。

```bash
cd apps/worker
npx wrangler login
```

2. secret を登録します。

```bash
npx wrangler secret put RECAPTCHA_SECRET_KEY
```

3. `apps/worker/wrangler.toml` の `ALLOWED_ORIGIN` を GitHub Pages の公開 URL に変更します。  
   例: `https://your-account.github.io/ai-love-you`

4. デプロイします。

```bash
npm run deploy:worker
```

5. Worker の公開 URL を GitHub の `VITE_VERIFY_API_URL` secret に設定します。

## Google reCAPTCHA 設定

1. Google reCAPTCHA で Checkbox v2 の site key / secret key を発行します。
2. ドメインに以下を追加します。

- GitHub Pages のドメイン
- `localhost`
- 必要なら `127.0.0.1`

## 補足

- フロントは `apps/web/vite.config.ts` で GitHub Pages 用の base path を `ai-love-you` にしています。
- リポジトリ名を変える場合は `repoName` を合わせて変更してください。
