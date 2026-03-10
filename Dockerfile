# ビルドステージ
FROM node:18 AS builder

WORKDIR /build

# ルートのpackage.jsonと各ディレクトリのファイルをコピー
COPY package*.json ./
COPY server/ server/
COPY site/ site/
COPY type.d.ts ./

# 依存関係のインストールとビルド
# server/dist/index.js が作成され、site/dist が作成される
# その後、ルートのbuildスクリプトで /app にまとめられる
RUN npm run setup && npm run build

# 実行ステージ
FROM node:18-slim

# SQLite3の動作に必要なライブラリをインストール（必要に応じて）
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ビルド済みバイナリとフロントエンド資産をコピー
COPY --from=builder /app/main.js ./
COPY --from=builder /app/site-dist ./site-dist

# サーバー用の依存関係のみをインストール
# main.jsが依存するモジュール（better-sqlite3等）を確実に動作させるため
COPY server/package*.json ./
RUN npm install --omit=dev

# データベース保存用ディレクトリ
RUN mkdir -p /data && chown -R node:node /data

# 実行ユーザーの切り替え
USER node

# 環境変数の設定
ENV NODE_ENV=production
ENV DB_PATH=/data/kintore.db

# アプリケーションポート
EXPOSE 8080

# アプリケーションの起動
CMD ["node", "main.js"]
