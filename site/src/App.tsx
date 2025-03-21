import './App.css';
import { Box, Typography, LinearProgress, Fade, Button } from '@mui/material';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { DataStructure } from '../../type.d';
import Kintore from './kintore';
function App() {
    const [kintoreData, setKintoreData] = useState<DataStructure | null>(null);

    useEffect(() => {
        get_data().then(data => {
            if (data && !data?.error) {
                setKintoreData(data);
            }
        })
    }, []);

    return (
        <>
            { kintoreData ? <Kintore data={kintoreData} /> : 
                <Box>
                    <Typography variant="h6">データが読み込みで、予期しないエラーが発生しました。</Typography>
                    <Button variant="contained" color="error" onClick={() => window.location.reload()}>
                        再読み込み
                    </Button>
                </Box>
            }
            <Fade in={kintoreData === null} timeout={500}>
                <Box sx={{ 
                    backgroundColor: 'white', 
                    padding: 2, 
                    borderRadius: 2, 
                    position: 'fixed', 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                }}>
                    <Typography variant="h6">現在の筋トレ状況を読み込み中...</Typography>
                    <LinearProgress sx={{ width: '75%' }}/>
                </Box>
            </Fade>
        </>
    );
}

export default App;

// API

async function get_data() {
    const res = await axios.get('/api/get_data');
    return res.data;
}

async function update_data(username: string, exercises: { id: number, count: number }[]) {
    const res = await axios.post('/api/update_data', { username, exercises });
    return res.data;
}
