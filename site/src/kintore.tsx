import { Typography, Box, Fade, Container, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Card, CardContent, Grid, Table, TableHead, TableRow, TableCell, TableBody, Paper, TextField, Autocomplete, Button, Alert, Snackbar, TableContainer } from '@mui/material';
import { DataStructure, UserExerciseCount } from '../../type.d';
import { useState } from 'react';
import axios from 'axios';

const calc_remaining_count = (data: DataStructure) => {
    return data.userExerciseCounts.map(userCount => userCount.count).reduce((a, b) => a - b, 1000000000000);
};

const gennerate_exercise_table = (userCount: UserExerciseCount, index: number, data: DataStructure) => (
    <TableRow key={userCount.userId}>
        <TableCell>{index + 1}</TableCell>
        <TableCell>{data.users.find(user => user.id === userCount.userId)?.username}</TableCell>
        <TableCell align='right'>{userCount.count}</TableCell>
    </TableRow>
)

export default function kintore({ data }: { data: DataStructure }) {
    const [username, setUsername] = useState<string>(localStorage.getItem('username') || '');
    const [kintore, setKintore] = useState<{ id: number; count: number }[]>([]);
    const [alert, setAlert] = useState<{ severity: 'success' | 'error'; message: string; isOpen: boolean }>({ severity: 'success', message: '', isOpen: false });
    const [allShowRow, setAllShowRow] = useState<number>(-1);

    const handle_submit = () => {
        localStorage.setItem('username', username);
        axios
            .post('/api/update_data', {
                username: username,
                exercises: kintore,
            })
            .then(res => {
                if (res.status === 200) {
                    setAlert({ severity: 'success', message: '更新しました', isOpen: true });
                } else {
                    setAlert({ severity: 'error', message: '更新に失敗しました', isOpen: true });
                }
            });
    };

    const handle_kintore_change = (exercise_id: number, count: number) => {
        console.log(exercise_id, count);
        setKintore(prev => {
            const newKintore = [...prev];
            const index = newKintore.findIndex(item => item.id === exercise_id);
            if (index !== -1) {
                newKintore[index] = { id: exercise_id, count };
            } else {
                newKintore.push({ id: exercise_id, count });
            }
            console.log(newKintore);
            return newKintore;
        });
    }

    return (
        <>
            <Container maxWidth='lg' sx={{ py: 4 }}>
                <Snackbar open={alert.isOpen} autoHideDuration={6000} onClose={() => setAlert({ severity: 'success', message: '', isOpen: false })}>
                    <Alert severity={alert.severity}>{alert.message}</Alert>
                </Snackbar>
            </Container>
            <Fade in={true} timeout={1000}>
                <Container maxWidth='lg' sx={{ py: 4 }}>
                    <Typography variant='h2' component='h1' gutterBottom align='center'>
                        筋トレカウンター
                    </Typography>

                    <Card sx={{ mb: 4, bgcolor: 'primary.light', color: 'white' }}>
                        <CardContent>
                            <Typography variant='h3' component='div' align='center'>
                                残り筋トレ数
                            </Typography>
                            <Typography variant='h2' component='div' align='center' sx={{ fontWeight: 'bold' }}>
                                {calc_remaining_count(data).toLocaleString()}回
                            </Typography>
                            <Typography variant='body2' align='center'>
                                目標: 1兆回
                            </Typography>
                        </CardContent>
                    </Card>

                    <Grid container spacing={4}>
                        {/* 筋トレ投稿フォーム */}
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant='h5' component='div' gutterBottom>
                                        今日の筋トレを登録
                                    </Typography>
                                    <Box component='form' onSubmit={handle_submit} sx={{ mt: 2 }}>
                                        <Autocomplete
                                            freeSolo
                                            options={data.users.map(user => user.username)}
                                            value={username}
                                            onChange={(_, newValue) => {
                                                setUsername(newValue || '');
                                            }}
                                            inputValue={username}
                                            onInputChange={(_, newInputValue) => {
                                                setUsername(newInputValue);
                                            }}
                                            renderInput={params => <TextField {...params} label='ユーザー名' fullWidth margin='normal' required />}
                                        />

                                        {data.exercises.map(exercise => (
                                            <TextField key={exercise.id} label={exercise.name} type='number' fullWidth margin='normal' value={kintore.find(item => item.id === exercise.id)?.count || 0} onChange={e => handle_kintore_change(exercise.id, parseInt(e.target.value) || 0)} InputProps={{ inputProps: { min: 0 } }} />
                                        ))}

                                        <Button type='submit' variant='contained' fullWidth sx={{ mt: 2 }} disabled={!username} >
                                            登録する
                                        </Button>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* 種目別ランキング */}
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant='h5' component='div' gutterBottom>
                                        種目別ランキング
                                    </Typography>

                                    {data.exercises.map((exercise, index) => (
                                        <Box key={exercise.id} sx={{ mb: 3 }}>
                                            <Typography variant='h6' gutterBottom>
                                                {exercise.name}
                                            </Typography>
                                            <TableContainer component={Paper}>
                                                <Table size='small'>
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell>順位</TableCell>
                                                            <TableCell>ユーザー名</TableCell>
                                                            <TableCell align='right'>回数</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {(() => {
                                                            const exerciseCounts = data.userExerciseCounts
                                                            .filter(userCount => userCount.exerciseId === exercise.id)
                                                            .sort((a, b) => b.count - a.count);
                                                            // allShowRowとindexが一致している場合は全件表示、それ以外は先頭5件のみ表示
                                                            const visibleRows = index === allShowRow ? exerciseCounts : exerciseCounts.slice(0, 5);
                                                            return (
                                                            <>
                                                                {visibleRows.map((userCount, i) => gennerate_exercise_table(userCount, i, data))}
                                                                {/* 5件以上存在し、かつ現在は全件表示していない場合は「...」行を追加 */}
                                                                {index !== allShowRow && exerciseCounts.length > 5 && (
                                                                <TableRow onClick={() => setAllShowRow(index)} style={{ cursor: 'pointer' }}>
                                                                    <TableCell colSpan={3} align="center">
                                                                    全件表示
                                                                    </TableCell>
                                                                </TableRow>
                                                                )}
                                                                {/* データがない場合 */}
                                                                {exerciseCounts.length === 0 && (
                                                                <TableRow>
                                                                    <TableCell colSpan={3} align="center">
                                                                    データがありません
                                                                    </TableCell>
                                                                </TableRow>
                                                                )}
                                                            </>
                                                            );
                                                        })()}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        </Box>
                                    ))}
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Container>
            </Fade>
        </>
    );
}
