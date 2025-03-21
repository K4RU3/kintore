import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from "fs"
import * as Exercise from "../../type.js"

const app = express();
const PORT = 8080;
const DATA_FILE = process.env.DEBUG === "true" ? path.join(__dirname, 'kintore.json') : path.join('/data', 'kintore.json');

// CORSを有効にする
app.use(cors());

// JSONリクエストを解析するミドルウェア
app.use(express.json());

app.get('/api/get_data', (req, res) => {
    try {
        const data = get_valid_data();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get data' });
    }
});

app.post('/api/update_data', (req, res) => {
    try {
        if (!validate_network_data(req.body)) {
            res.status(400).json({ error: 'Invalid request body' });
            return;
        }

        const network_data = req.body;
        if (!update_data(network_data)) {
            res.status(500).json({ error: 'Failed to update data' });
            return;
        }
        res.json({ message: 'Data updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update data' });
    }
});

// 静的ファイルを提供するミドルウェア
app.use(express.static(path.join(__dirname, 'site')));

// サーバーを起動する
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

/* ==========  関数定義 ========== */
function get_valid_data(): Exercise.DataStructure {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        const jsonData = JSON.parse(data);
        if (!validate_data(jsonData)) {
            return initialize_data();
        }
        return jsonData;
    } catch (error) {
        return initialize_data();
    }
}

function validate_data(data: any): data is Exercise.DataStructure {
    if (typeof data !== 'object' || data === null) {
        return false;
    }

    if (['users', 'exercises', 'userExerciseCounts'].some(key => !(key in data) || !Array.isArray(data[key]))) {
        return false;
    }

    if (data.users.some((user: any) => 
            typeof user !== 'object' || user === null ||
            !('id' in user) || !('username' in user) || 
            typeof user.id !== 'number' || typeof user.username !== 'string')) {
        return false;
    }

    if (data.exercises.some((exercise: any) => 
            typeof exercise !== 'object' || exercise === null ||
            !('id' in exercise) || !('name' in exercise) || !('unit' in exercise) || !('description' in exercise) ||
            typeof exercise.id !== 'number' || typeof exercise.name !== 'string' || typeof exercise.unit !== 'string' || typeof exercise.description !== 'string')) {
        return false;
    }

    if (data.userExerciseCounts.some((count: any) => 
            typeof count !== 'object' || count === null ||
            !('userId' in count) || !('exerciseId' in count) || !('count' in count) ||
            typeof count.userId !== 'number' || typeof count.exerciseId !== 'number' || typeof count.count !== 'number')) {
        return false;
    }

    return true;
}

function initialize_data(): Exercise.DataStructure {
    const data: Exercise.DataStructure = {
        users: [],
        exercises: [],
        userExerciseCounts: []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return data;
}

function validate_network_data(data: any): data is Exercise.NetworkData {
    if (typeof data !== 'object' || data === null) {
        return false;
    }
    
    if (!('username' in data) || typeof data.username !== 'string') {
        return false;
    }

    if (!('exercises' in data) || !Array.isArray(data.exercises)) {
        return false;
    }

    if (data.exercises.some((exercise: any) => 
            typeof exercise !== 'object' || exercise === null ||
            !('id' in exercise) || !('count' in exercise) ||
            typeof exercise.id !== 'number' || typeof exercise.count !== 'number')) {
        return false;
    }

    return true;
}

function update_data(network_data: Exercise.NetworkData): boolean {
    try {
        console.log(network_data);
        let data = get_valid_data();
        const { username, exercises } = network_data;
        let userid = data.users.find(user => user.username === username)?.id;
        if (!userid) {
            data.users.push({
                id: data.users.length + 1,
                username: username
            });
            userid = data.users.length;
        }

        exercises.forEach(exercise => {
            console.log(exercise, userid);
            let exercise_data = data.exercises.find(e => e.id === exercise.id);
            if (exercise_data) {
                let userExerciseCount = data.userExerciseCounts.find(count => count.userId === userid && count.exerciseId === exercise.id);
                if (userExerciseCount) {
                    userExerciseCount.count += exercise.count;
                } else {
                    data.userExerciseCounts.push({
                        userId: userid,
                        exerciseId: exercise.id,
                        count: exercise.count
                    });
                }
            } else {
                console.warn(`Exercise with id ${exercise.id} not found`);
            }
        });

        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Failed to update data:', error);
        return false;
    }
}
