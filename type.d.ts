export interface User {
    id: number;
    username: string;
}

export interface Exercise {
    id: number;
    name: string;
    unit: string;
}

export interface UserExerciseCount {
    userId: number;
    exerciseId: number;
    count: number;
}

export interface DataStructure {
    users: User[];
    exercises: Exercise[];
    userExerciseCounts: UserExerciseCount[];
}

export interface NetworkData {
    username: string;
    exercises: {
        id: number;
        count: number;
    }[];
}
