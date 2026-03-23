# 株式会社日亜パートナーズ 公式サイト（静的HTML）

ブラウザでそのまま表示できる静的サイトです（HTML / CSS / JavaScript）。

## ローカルで確認

`index.html` をブラウザで開くか、ルートで次のように簡易サーバーを起動してください。

```bash
npx --yes serve .
```

## GitHub に上げる手順

1. [GitHub](https://github.com) にログインし、**New repository** で空のリポジトリを作成（README は追加しなくてよい）。
2. このフォルダで次を実行（`YOUR_USER` と `YOUR_REPO` を置き換え）。

```bash
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git branch -M main
git push -u origin main
```

初回だけ Git の名前・メールが未設定なら：

```bash
git config --global user.name "あなたの名前"
git config --global user.email "you@example.com"
```

## GitHub Pages で URL を公開する

1. GitHub 上のリポジトリ → **Settings** → **Pages**。
2. **Build and deployment** の **Branch** で `main` / `/ (root)` を選び **Save**。
3. 1〜2分後に `https://YOUR_USER.github.io/YOUR_REPO/` で公開されます（リポジトリ名により URL は変わります）。

## 含まれる主なファイル

- `index.html` … トップ
- `about.html` / `business.html` / `contact.html`
- `css/site.css` / `js/site.js` / `js/world-map.js`
- `media/` … 画像・ヒーロー動画など
