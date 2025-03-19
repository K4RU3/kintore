import express from 'express';
import cors from 'cors';
import path from 'path';

const app = express();
const PORT = 8080;

// CORSを有効にする
app.use(cors());

// JSONリクエストを解析するミドルウェア
app.use(express.json());

app.get('/api/ping', (req, res) => {
    res.json({ message: 'pong' });
});

// 静的ファイルを提供するミドルウェア
app.use(express.static(path.join(__dirname, 'site')));

// サーバーを起動する
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
