import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const kintoreFilePath = path.join(__dirname, 'kintore.json');
const app = express();
const PORT = process.env.PORT || 3000;
// デフォルトのkintoreデータ
const defaultKintoreData = {
    users: [],
    names: [
        { id: "kuukiisu", name: "空気椅子" },
        { id: "udetate", name: "腕立て伏せ" },
        { id: "zyoutaiokoshi", name: "上体起こし" },
        { id: "ranji", name: "ランジ" }
    ]
};
// kintore.jsonを初期化する関数
const initializeKintoreData = () => {
    if (!fs.existsSync(kintoreFilePath)) {
        fs.writeFileSync(kintoreFilePath, JSON.stringify(defaultKintoreData, null, 2));
    }
    else {
        const data = fs.readFileSync(kintoreFilePath, 'utf-8');
        try {
            const parsedData = JSON.parse(data);
            // データの形式を検証
            if (!Array.isArray(parsedData.users)) {
                throw new Error('Invalid data format');
            }
        }
        catch (error) {
            // 不正なデータの場合、デフォルトの内容で初期化
            fs.writeFileSync(kintoreFilePath, JSON.stringify(defaultKintoreData, null, 2));
        }
    }
};
// 初期化処理を実行
initializeKintoreData();
// ボディパーサーのミドルウェアを使用
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// 静的ファイルを提供するためのミドルウェア
app.use(express.static(path.join(__dirname, 'site/build')));
// /api/addエンドポイントのPOSTリクエストを処理
app.post('/api/add', (req, res) => {
    const { username, kintore } = req.body;
    // kintore.jsonを読み込む
    const data = fs.readFileSync(kintoreFilePath, 'utf-8');
    const kintoreData = JSON.parse(data);
    // ユーザーが既に存在するか確認
    const userIndex = kintoreData.users.findIndex(user => user.username === username);
    if (userIndex !== -1) {
        // ユーザーが存在する場合、kintoreデータを加算
        kintoreData.users[userIndex].kintore.kuukiisu = (kintoreData.users[userIndex].kintore.kuukiisu || 0) + (kintore.kuukiisu || 0);
        kintoreData.users[userIndex].kintore.udetate = (kintoreData.users[userIndex].kintore.udetate || 0) + (kintore.udetate || 0);
        kintoreData.users[userIndex].kintore.zyoutaiokoshi = (kintoreData.users[userIndex].kintore.zyoutaiokoshi || 0) + (kintore.zyoutaiokoshi || 0);
        kintoreData.users[userIndex].kintore.ranji = (kintoreData.users[userIndex].kintore.ranji || 0) + (kintore.ranji || 0);
    }
    else {
        // ユーザーが存在しない場合、新しいユーザーを追加
        kintoreData.users.push({ username, kintore });
    }
    // データの形式を検証
    const isValidData = (data) => {
        return Array.isArray(data.users) && data.users.every(user => typeof user.username === 'string' &&
            typeof user.kintore === 'object' &&
            user.kintore !== null &&
            typeof user.kintore.kuukiisu === 'number' &&
            typeof user.kintore.udetate === 'number' &&
            typeof user.kintore.zyoutaiokoshi === 'number' &&
            typeof user.kintore.ranji === 'number');
    };
    // データが正しい形式である場合のみ保存
    if (isValidData(kintoreData)) {
        fs.writeFileSync(kintoreFilePath, JSON.stringify(kintoreData, null, 2));
        res.json({ message: 'Data updated successfully', username, kintore });
    }
    else {
        res.status(400).json({ message: 'Invalid data format' });
    }
});
// /api/kintoreエンドポイントのGETリクエストを処理
app.get('/api/kintore', (req, res) => {
    const data = fs.readFileSync(kintoreFilePath, 'utf-8');
    const kintoreData = JSON.parse(data);
    res.json(kintoreData);
});
// サーバーを起動する関数
const startServer = () => {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
};
// モジュールとしてエクスポート
export { startServer };
