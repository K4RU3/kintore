import './App.css';
import { Box, Typography } from '@mui/material';
import axios from 'axios';
import { useEffect, useState } from 'react';

function App() {
    const [translations, setTranslations] = useState<Language>({
        title: '',
        description: '',
        goal: '',
    });

    useEffect(() => {
        const language = navigator.language.startsWith('ja') ? 'jp' : 'en';
        axios.get('/api/languages/' + language)
            .then((res) => {
                setTranslations(res.data);
            })
            .catch((err) => {
                console.error(err);
            });
    }, []);

    return (
        <>
            <Box
                sx={{
                    backgroundColor: 'primary.main',
                    padding: 2,
                }}
            >
                <Typography variant='h1' color='white' align='left'>
                    <span>{translations.title}</span>
                </Typography>
            </Box>
        </>
    );
}

export default App;
