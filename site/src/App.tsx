import { useState, useEffect } from 'react';
import './App.css';
import { api } from './api';
import type { Exercise, RankingEntry } from './api';
import { Settings, PlusCircle, Trophy, X } from 'lucide-react';

function App() {
  const [counter, setCounter] = useState<number>(0);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [rankingExercise, setRankingExercise] = useState<string>('');
  const [userName, setUserName] = useState<string>(localStorage.getItem('workout_user_name') || '');
  const [amount, setAmount] = useState<number>(10);
  const [showSettings, setShowSettings] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Request exercise modal state
  const [reqName, setReqName] = useState('');
  const [reqUnit, setReqUnit] = useState('');
  const [reqUnitAmount, setReqUnitAmount] = useState(1);
  const [reqCounterAmount, setReqCounterAmount] = useState(1);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchCounter, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [c, exes] = await Promise.all([api.getCounter(), api.getExercises()]);
      setCounter(c);
      setExercises(exes);
      if (exes.length > 0) {
        setSelectedExercise(exes[0].id);
        setRankingExercise(exes[0].id);
        fetchRanking(exes[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCounter = async () => {
    try {
      const c = await api.getCounter();
      setCounter(c);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRanking = async (exId: string) => {
    try {
      const r = await api.getRanking(exId);
      setRanking(r);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !selectedExercise || amount <= 0) return;

    try {
      const res = await api.registerWorkout(userName, selectedExercise, amount);
      localStorage.setItem('workout_user_name', userName);
      setCounter(res.remaining);
      setSuccessMsg(`登録完了! (-${res.counterDelta})`);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchRanking(rankingExercise);
    } catch (err) {
      alert('エラーが発生しました');
    }
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.requestExercise({
        name: reqName,
        unit: reqUnit,
        unitAmount: reqUnitAmount,
        counterAmount: reqCounterAmount
      });
      alert('リクエストを送信しました');
      setShowSettings(false);
      setReqName('');
      setReqUnit('');
    } catch (err) {
      alert('エラーが発生しました');
    }
  };

  return (
    <div className="app-container">
      <header>
        <button className="settings-btn" onClick={() => setShowSettings(true)}>
          <Settings size={20} />
          設定・種目追加
        </button>
      </header>

      <section className="counter-section">
        <div className="counter-label">残りカウンター</div>
        <div className="counter-value">{counter.toLocaleString()}</div>
      </section>

      <main className="main-grid">
        <section className="card">
          <h2 className="card-title">
            <PlusCircle size={24} />
            カウント登録
          </h2>
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label>ユーザー名</label>
              <input 
                type="text" 
                value={userName} 
                onChange={(e) => setUserName(e.target.value)} 
                placeholder="名前を入力"
                maxLength={32}
                required
              />
            </div>
            <div className="form-group">
              <label>種目</label>
              <select 
                value={selectedExercise} 
                onChange={(e) => setSelectedExercise(e.target.value)}
              >
                {exercises.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>量 ({exercises.find(ex => ex.id === selectedExercise)?.unit || ''})</label>
              <input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(Number(e.target.value))} 
                min={1}
                max={100000}
                required
              />
            </div>
            <button type="submit" className="btn-primary">登録</button>
            {successMsg && <div className="success-message">{successMsg}</div>}
          </form>
        </section>

        <section className="card">
          <h2 className="card-title">
            <Trophy size={24} />
            種目ランキング
          </h2>
          <div className="form-group">
            <select 
              value={rankingExercise} 
              onChange={(e) => {
                setRankingExercise(e.target.value);
                fetchRanking(e.target.value);
              }}
            >
              {exercises.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>
          </div>
          <ul className="ranking-list">
            {ranking.map(item => (
              <li key={item.userId} className="ranking-item">
                <span className="rank-number">{item.rank}</span>
                <span className="rank-name">{item.userName}</span>
                <span className="rank-amount">
                  {item.amount.toLocaleString()} {exercises.find(ex => ex.id === rankingExercise)?.unit}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>種目追加リクエスト</h2>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowSettings(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleRequest}>
              <div className="form-group">
                <label>種目名</label>
                <input type="text" value={reqName} onChange={e => setReqName(e.target.value)} placeholder="例: 懸垂" required />
              </div>
              <div className="form-group">
                <label>単位</label>
                <input type="text" value={reqUnit} onChange={e => setReqUnit(e.target.value)} placeholder="例: 回" required />
              </div>
              <div className="form-group">
                <label>単位あたりの量</label>
                <input type="number" value={reqUnitAmount} onChange={e => setReqUnitAmount(Number(e.target.value))} min={1} required />
              </div>
              <div className="form-group">
                <label>減るカウント量</label>
                <input type="number" value={reqCounterAmount} onChange={e => setReqCounterAmount(Number(e.target.value))} min={1} required />
              </div>
              <button type="submit" className="btn-primary">リクエスト送信</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
