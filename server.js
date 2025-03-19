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
        { id: "kuukiisu", name: "空気椅子", count: "30秒 -> 10" },
        { id: "udetate", name: "腕立て伏せ", count: "10回 -> 10" },
        { id: "zyoutaiokoshi", name: "上体起こし", count: "10回 -> 10" },
        { id: "ranji", name: "ランジ", count: "10セット -> 10" },
        { id: "sukuwatto", name: "スクワット", count: "10回 -> 10" },
        { id: "puranku", name: "プランク", count: "30秒 -> 10" }
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
            // 古いプロパティをデフォルトで更新
            parsedData.names.forEach((menu) => {
                if (!menu.count) {
                    const defaultMenu = defaultKintoreData.names.find(m => m.id === menu.id);
                    if (defaultMenu) {
                        menu.count = defaultMenu.count; // デフォルトのcountを設定
                    }
                }
            });
            fs.writeFileSync(kintoreFilePath, JSON.stringify(parsedData, null, 2)); // 更新されたデータを保存
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
app.use(express.static(path.join(__dirname, 'site/dist')));
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
        kintoreData.names.forEach(menu => {
            const menuId = menu.id;
            // menuIdをstring型として扱い、インデックスアクセスを修正
            kintoreData.users[userIndex].kintore[menuId] =
                (kintoreData.users[userIndex].kintore[menuId] || 0) + (kintore[menuId] || 0);
        });
    }
    else {
        // ユーザーが存在しない場合、新しいユーザーを追加
        // 新しいユーザーのkintoreオブジェクトに全てのメニューを含める
        const newKintore = {
            kuukiisu: null,
            udetate: null,
            zyoutaiokoshi: null,
            ranji: null,
            sukuwatto: null,
            puranku: null
        };
        kintoreData.names.forEach(menu => {
            newKintore[menu.id] = kintore[menu.id] || 0;
        });
        kintoreData.users.push({ username, kintore: newKintore });
    }
    // データを保存
    fs.writeFileSync(kintoreFilePath, JSON.stringify(kintoreData, null, 2));
    res.json({ message: 'Data updated successfully', username, kintore });
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
