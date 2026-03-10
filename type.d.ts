declare global {
    interface User {
        id: number;
        username: string;
    }

    interface Exercise {
        id: number;
        name: string;
        unit: string;
        description: string;
    }

    interface UserExerciseCount {
        userId: number;
        exerciseId: number;
        count: number;
    }

    interface DataStructure {
        users: User[];
        exercises: Exercise[];
        userExerciseCounts: UserExerciseCount[];
    }

    interface NetworkData {
        username: string;
        exercises: {
            id: number;
            count: number;
        }[];
    }
}

export {};
