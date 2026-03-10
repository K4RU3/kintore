# ビルドステージ
FROM node:18 AS builder

# ネイティブモジュール（better-sqlite3等）のビルドに必要なツールをインストール
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# 各 package.json を先にコピーしてインストールし、キャッシュを有効化
COPY package*.json ./
COPY server/package*.json ./server/
COPY site/package*.json ./site/

# 依存関係のインストール
RUN npm run setup

# ソースコードをコピーしてビルド
COPY server/ server/
COPY site/ site/
COPY type.d.ts ./

# 個別にビルドを実行し、失敗箇所を特定しやすくする
RUN npm run build:site
RUN npm run build:server

# 実行ステージ
FROM node:18-slim

# SQLite3の動作に必要なランタイムライブラリをインストール
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ビルド資産をコピー
# バックエンドの成果物 (server/dist)
COPY --from=builder /build/server/dist ./server-dist
# フロントエンドの成果物 (site/dist)
COPY --from=builder /build/site/dist ./server-dist/site-dist

# 実行用の依存関係のみをインストール
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

# アプリケーションの起動 (server-dist/index.js を実行)
CMD ["node", "server-dist/index.js"]
