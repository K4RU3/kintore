import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

const app = express();
const port = 8080;

app.use(cors());
app.use(bodyParser.json());

// DB Initialization
const dbPath = process.env.DB_PATH || '/data/kintore.db';
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    unit_amount INTEGER NOT NULL,
    counter_amount INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS workout_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    input_amount INTEGER NOT NULL,
    counter_delta INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_exercise_counts (
    user_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    PRIMARY KEY (user_id, exercise_id)
  );

  CREATE TABLE IF NOT EXISTS global_counter (
    id INTEGER PRIMARY KEY,
    remaining_count INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS exercise_requests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    unit_amount INTEGER NOT NULL,
    counter_amount INTEGER NOT NULL,
    requested_by TEXT,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

// Initialize global counter if not exists
const globalCounter = db.prepare('SELECT remaining_count FROM global_counter WHERE id = 1').get();
if (!globalCounter) {
  db.prepare('INSERT INTO global_counter (id, remaining_count) VALUES (1, 1000000000000)').run();
}

// Initial exercises if empty
const exercisesCount = db.prepare('SELECT COUNT(*) as count FROM exercises').get() as { count: number };
if (exercisesCount.count === 0) {
  const initialExercises = [
    { id: 'pushup', name: '腕立て伏せ', unit: '回', unit_amount: 1, counter_amount: 1 },
    { id: 'squat', name: 'スクワット', unit: '回', unit_amount: 1, counter_amount: 1 },
    { id: 'situp', name: '腹筋', unit: '回', unit_amount: 1, counter_amount: 1 },
    { id: 'plank', name: 'プランク', unit: '秒', unit_amount: 30, counter_amount: 10 },
  ];
  const insert = db.prepare('INSERT INTO exercises (id, name, unit, unit_amount, counter_amount, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  const now = Date.now();
  for (const ex of initialExercises) {
    insert.run(ex.id, ex.name, ex.unit, ex.unit_amount, ex.counter_amount, now);
  }
}

// Routes
// 4.1 残りカウンター取得
app.get('/api/v1/counter', (req, res) => {
  const row = db.prepare('SELECT remaining_count FROM global_counter WHERE id = 1').get() as { remaining_count: number };
  res.json({
    success: true,
    data: {
      remaining: row.remaining_count
    }
  });
});

// 4.2 種目一覧取得
app.get('/api/v1/exercises', (req, res) => {
  const rows = db.prepare('SELECT * FROM exercises ORDER BY created_at').all() as any[];
  res.json({
    success: true,
    data: rows.map(r => ({
      id: r.id,
      name: r.name,
      unit: r.unit,
      unitAmount: r.unit_amount,
      counterAmount: r.counter_amount
    }))
  });
});

// 4.3 ユーザー検索
app.get('/api/v1/users', (req, res) => {
  const q = (req.query.q as string) || '';
  const rows = db.prepare('SELECT id, name FROM users WHERE name LIKE ? ORDER BY name LIMIT 10').all(q + '%') as any[];
  res.json({
    success: true,
    data: rows
  });
});

// 4.4 カウント登録
app.post('/api/v1/workouts', (req, res) => {
  const { userName, exerciseId, amount } = req.body;

  if (!userName || !exerciseId || amount === undefined) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Missing parameters' } });
  }

  if (amount < 1 || amount > 100000) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_AMOUNT', message: 'Amount must be between 1 and 100000' } });
  }

  try {
    const transaction = db.transaction(() => {
      // 1-2. user search / creation
      let user = db.prepare('SELECT id, name FROM users WHERE name = ?').get(userName) as { id: string, name: string } | undefined;
      if (!user) {
        const id = crypto.randomUUID();
        db.prepare('INSERT INTO users (id, name, created_at) VALUES (?, ?, ?)').run(id, userName, Date.now());
        user = { id, name: userName };
      }

      // 3. exercises retrieval
      const exercise = db.prepare('SELECT * FROM exercises WHERE id = ?').get(exerciseId) as any;
      if (!exercise) {
        throw new Error('EXERCISE_NOT_FOUND');
      }

      // 4. counter_delta calculation
      // counter_delta = (counter_amount / unit_amount) * amount
      const counterDelta = Math.floor((exercise.counter_amount / exercise.unit_amount) * amount);

      // 5. workout_logs addition
      const workoutId = crypto.randomUUID();
      db.prepare('INSERT INTO workout_logs (id, user_id, exercise_id, input_amount, counter_delta, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(workoutId, user.id, exercise.id, amount, counterDelta, Date.now());

      // 6. user_exercise_counts update
      const userCount = db.prepare('SELECT amount FROM user_exercise_counts WHERE user_id = ? AND exercise_id = ?').get(user.id, exercise.id) as { amount: number } | undefined;
      if (userCount) {
        db.prepare('UPDATE user_exercise_counts SET amount = amount + ? WHERE user_id = ? AND exercise_id = ?')
          .run(amount, user.id, exercise.id);
      } else {
        db.prepare('INSERT INTO user_exercise_counts (user_id, exercise_id, amount) VALUES (?, ?, ?)')
          .run(user.id, exercise.id, amount);
      }

      // 7. global_counter reduction
      db.prepare('UPDATE global_counter SET remaining_count = remaining_count - ? WHERE id = 1').run(counterDelta);

      const remainingRow = db.prepare('SELECT remaining_count FROM global_counter WHERE id = 1').get() as { remaining_count: number };

      return {
        userId: user.id,
        remaining: remainingRow.remaining_count,
        counterDelta
      };
    });

    const result = transaction();
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    if (error.message === 'EXERCISE_NOT_FOUND') {
      res.status(404).json({ success: false, error: { code: 'EXERCISE_NOT_FOUND', message: 'Exercise not found' } });
    } else {
      console.error(error);
      res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
    }
  }
});

// 4.5 種目ランキング
app.get('/api/v1/ranking/:exerciseId', (req, res) => {
  const { exerciseId } = req.params;
  const rows = db.prepare(`
    SELECT 
      u.id as userId, 
      u.name as userName, 
      uec.amount
    FROM user_exercise_counts uec
    JOIN users u ON uec.user_id = u.id
    WHERE uec.exercise_id = ?
    ORDER BY uec.amount DESC
    LIMIT 100
  `).all(exerciseId) as any[];

  res.json({
    success: true,
    data: rows.map((r, index) => ({
      rank: index + 1,
      userId: r.userId,
      userName: r.userName,
      amount: r.amount
    }))
  });
});

// 4.6 ユーザー名変更
app.patch('/api/v1/users/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || name.length < 1 || name.length > 32) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_NAME', message: 'Name must be 1-32 characters' } });
  }

  const existing = db.prepare('SELECT id FROM users WHERE name = ? AND id != ?').get(name, id);
  if (existing) {
    return res.status(400).json({ success: false, error: { code: 'USERNAME_EXISTS', message: 'username already exists' } });
  }

  try {
    const result = db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    }
    res.json({ success: true, data: {} });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// 4.7 種目追加リクエスト
app.post('/api/v1/exercise-requests', (req, res) => {
  const { name, unit, unitAmount, counterAmount, userId } = req.body;

  if (!name || !unit || !unitAmount || !counterAmount) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Missing parameters' } });
  }

  const id = 'req_' + crypto.randomUUID().slice(0, 8);
  db.prepare(`
    INSERT INTO exercise_requests (id, name, unit, unit_amount, counter_amount, requested_by, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, unit, unitAmount, counterAmount, userId || null, 'pending', Date.now());

  res.json({
    success: true,
    data: {
      id,
      status: 'pending'
    }
  });
});

// Static files (for production)
if (process.env.NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, 'site-dist');
  app.use(express.static(staticPath));
  app.use((req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
