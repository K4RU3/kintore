import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

const client = axios.create({
  baseURL: API_BASE,
});

export interface Exercise {
  id: string;
  name: string;
  unit: string;
  unitAmount: number;
  counterAmount: number;
}

export interface User {
  id: string;
  name: string;
}

export interface RankingEntry {
  rank: number;
  userId: string;
  userName: string;
  amount: number;
}

export const api = {
  getCounter: async () => {
    const res = await client.get('/counter');
    return res.data.data.remaining;
  },
  getExercises: async (): Promise<Exercise[]> => {
    const res = await client.get('/exercises');
    return res.data.data;
  },
  searchUsers: async (q: string): Promise<User[]> => {
    const res = await client.get('/users', { params: { q } });
    return res.data.data;
  },
  registerWorkout: async (userName: string, exerciseId: string, amount: number) => {
    const res = await client.post('/workouts', { userName, exerciseId, amount });
    return res.data.data;
  },
  getRanking: async (exerciseId: string): Promise<RankingEntry[]> => {
    const res = await client.get(`/ranking/${exerciseId}`);
    return res.data.data;
  },
  updateUserName: async (id: string, name: string) => {
    const res = await client.patch(`/users/${id}`, { name });
    return res.data;
  },
  requestExercise: async (data: { name: string; unit: string; unitAmount: number; counterAmount: number; userId?: string }) => {
    const res = await client.post('/exercise-requests', data);
    return res.data.data;
  },
};
