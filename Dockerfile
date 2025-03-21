FROM node:18

WORKDIR /

COPY package*.json .
COPY server/ server/
COPY site/ site/

RUN npm run setup && npm run build && \
    cp -r server/node_modules /app/node_modules && \
    rm -rf server && rm -rf site

# 永続化するためのディレクトリを作成
RUN mkdir -p /data

EXPOSE 8080

WORKDIR /app

CMD ["node", "main.js"]