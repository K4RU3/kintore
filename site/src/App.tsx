import { useState, useEffect } from 'react'
import './App.css'
import { Button, Container, Typography, TextField, Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Grid, CircularProgress, Autocomplete, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, useTheme } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';

interface Menu {
  id: string;
  name: string;
  count: string;
}

interface Kintore {
  [key: string]: number | null;
}

interface User {
  username: string;
  kintore: Kintore;
}

interface Data {
  users: User[];
  names: Menu[];
}

function App() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState<string>(localStorage.getItem('username') || '');
  const [kintore, setKintore] = useState<Kintore>({
    kuukiisu: 0,
    udetate: 0,
    zyoutaiokoshi: 0,
    ranji: 0,
    sukuwatto: 0,
    puranku: 0
  });
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  
  const theme = useTheme();
  console.log(theme);

  // データを取得する関数
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/kintore');
      if (!response.ok) {
        throw new Error('データの取得に失敗しました');
      }
      const result = await response.json();
      setData(result);
      setError(null);

      // 取得したデータを基にsetKintoreを更新
      const userKintore = result.users.find((user: User) => user.username === username);
      if (userKintore) {
        setKintore(userKintore.kintore);
      }
    } catch (err) {
      setError('データの取得中にエラーが発生しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 初回レンダリング時にデータを取得
  useEffect(() => {
    fetchData();
  }, []);

  // 筋トレデータを送信する関数
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, kintore }),
      });

      if (!response.ok) {
        throw new Error('データの送信に失敗しました');
      }
    
      localStorage.setItem('username', username);

      // 送信後にデータを再取得
      fetchData();
      
      // フォームをリセット
      const zeroKintore = Object.keys(kintore).reduce((acc, key) => {
        acc[key] = 0;
        return acc;
      }, {} as Kintore);

      setKintore(zeroKintore);
    } catch (err) {
      setError('データの送信中にエラーが発生しました');
      console.error(err);
    }
  };

  // 入力値の変更を処理する関数
  const handleKintoreChange = (id: keyof Kintore, value: number) => {
    setKintore(prev => ({
      ...prev,
      [id]: value
    }));
  };

  // 全ユーザーの筋トレ合計を計算
  const calculateTotalKintore = (): number => {
    if (!data) return 0;
    
    return data.users.reduce((total, user) => {
      const userTotal = Object.values(user.kintore).reduce((sum: number, value) => sum + (value || 0), 0);
      return total + (userTotal || 0);
    }, 0);
  };

  // 残りの筋トレ数（1兆から引いた値）
  const remainingKintore = 1000000000000 - calculateTotalKintore();

  // 種目別ランキングを計算
  const calculateRankings = () => {
    if (!data) return {};
    
    const rankings: Record<string, { username: string; count: number }[]> = {};
    
    data.names.forEach(menu => {
      const menuRanking = data.users
        .map(user => ({
          username: user.username,
          count: user.kintore[menu.id as keyof Kintore] || 0
        }))
        .sort((a, b) => b.count - a.count);
      
      rankings[menu.id] = menuRanking;
    });
    
    return rankings;
  };

  const rankings = calculateRankings();

  // ユーザー名の一覧を取得
  const getUsernames = (): string[] => {
    if (!data) return [];
    return data.users.map(user => user.username);
  };

  // ダイアログを開く関数
  const handleClickOpen = () => {
    setOpenDialog(true);
  };

  // ダイアログを閉じる関数
  const handleClose = () => {
    setOpenDialog(false);
  };

  // ダイアログの内容を更新
  const renderMenuDetails = () => {
    return data?.names.map(menu => (
      <Typography key={menu.id}>{menu.name}: {menu.count}</Typography>
    ));
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: 'white' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Typography color="error" variant="h6">{error}</Typography>
        <Button variant="contained" onClick={fetchData}>再試行</Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h2" component="h1" gutterBottom align="center">
        筋トレカウンター
      </Typography>
      
      <IconButton 
        sx={{ position: 'absolute', top: 16, right: 16, fontSize: '4rem' }}
        onClick={handleClickOpen}
      >
        <InfoIcon sx={{ fontSize: 'inherit', color: 'white' }} />
      </IconButton>

      {/* Discordサーバー参加ボタン */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
        <Button 
          variant="contained" 
          startIcon={<DiscordIcon />} 
          onClick={() => window.open('https://discord.gg/BgACCJHgvu', '_blank')}
        >
          Discordサーバーに参加
        </Button>
      </Box>

      {/* ダイアログの内容 */}
      <Dialog open={openDialog} onClose={handleClose}>
        <DialogTitle>筋トレメニューの詳細</DialogTitle>
        <DialogContent>
          {renderMenuDetails()}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>閉じる</Button>
        </DialogActions>
      </Dialog>
      
      {/* 残り筋トレ数 */}
      <Card sx={{ mb: 4, bgcolor: 'primary.light', color: 'white' }}>
        <CardContent>
          <Typography variant="h3" component="div" align="center">
            残り筋トレ数
          </Typography>
          <Typography variant="h2" component="div" align="center" sx={{ fontWeight: 'bold' }}>
            {remainingKintore.toLocaleString()}回
          </Typography>
          <Typography variant="body2" align="center">
            目標: 1兆回
          </Typography>
        </CardContent>
      </Card>
      
      <Grid container spacing={4}>
        {/* 筋トレ投稿フォーム */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" component="div" gutterBottom>
                今日の筋トレを登録
              </Typography>
              <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                <Autocomplete
                  freeSolo
                  options={getUsernames()}
                  value={username}
                  onChange={(_, newValue) => {
                    setUsername(newValue || '');
                  }}
                  inputValue={username}
                  onInputChange={(_, newInputValue) => {
                    setUsername(newInputValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="ユーザー名"
                      fullWidth
                      margin="normal"
                      required
                    />
                  )}
                />
                
                {data?.names.map((menu) => (
                  <TextField
                    key={menu.id}
                    label={menu.name}
                    type="number"
                    fullWidth
                    margin="normal"
                    value={kintore[menu.id as keyof Kintore] || 0}
                    onChange={(e) => handleKintoreChange(menu.id as keyof Kintore, parseInt(e.target.value) || 0)}
                    InputProps={{ inputProps: { min: 0 } }}
                  />
                ))}
                
                <Button 
                  type="submit" 
                  variant="contained" 
                  fullWidth 
                  sx={{ mt: 2 }}
                  disabled={!username}
                >
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
              <Typography variant="h5" component="div" gutterBottom>
                種目別ランキング
              </Typography>
              
              {data?.names.map((menu) => (
                <Box key={menu.id} sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    {menu.name}
                  </Typography>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>順位</TableCell>
                          <TableCell>ユーザー名</TableCell>
                          <TableCell align="right">回数</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rankings[menu.id]?.slice(0, 5).map((rank, index) => (
                          <TableRow key={index}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{rank.username}</TableCell>
                            <TableCell align="right">{rank.count}</TableCell>
                          </TableRow>
                        ))}
                        {rankings[menu.id]?.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} align="center">データがありません</TableCell>
                          </TableRow>
                        )}
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
  );
}

export default App

