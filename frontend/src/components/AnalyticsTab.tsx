import React, { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Chip,
  Tooltip as MuiTooltip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
} from '@mui/material';
import {
  People as PeopleIcon,
  Chat as ChatIcon,
  MenuBook as KbIcon,
  HourglassEmpty as PendingIcon,
  Delete as DeleteIcon,
  Sort as SortIcon,
  Search as SearchIcon,
  Warning as WarningIcon,
  ArrowUpward as AscIcon,
  ArrowDownward as DescIcon,
  FormatListNumbered as OrderIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalChats: number;
  totalKbEntries: number;
  pendingApprovals: number;
  chatsByDay: { date: string; count: number }[];
  topSymptoms: { symptom: string; count: number }[];
}

const PIE_COLORS = ['#1976d2', '#dc004e', '#2e7d32', '#ed6c02', '#9c27b0'];

const StatCard: React.FC<{
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
}> = ({ label, value, icon, color, gradient }) => (
  <Card sx={{ 
    height: '100%', 
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    '&:hover': {
      transform: 'translateY(-5px)',
      boxShadow: `0 10px 30px ${color}33`,
      borderColor: 'rgba(255, 255, 255, 0.2)'
    }
  }}>
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600, letterSpacing: '0.5px', mb: 1 }} variant="caption">
            {label.toUpperCase()}
          </Typography>
          <Typography variant="h3" fontWeight="800" color="white">
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            background: gradient,
            borderRadius: 3,
            p: 1.5,
            display: 'flex',
            color: 'white',
            boxShadow: `0 8px 20px ${color}44`
          }}
        >
          {React.cloneElement(icon as React.ReactElement, { sx: { fontSize: 32 } })}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

type SortOption = 'order' | 'alpha_asc' | 'alpha_desc' | 'auto_first' | 'auto_last';

export const AnalyticsTab: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showKbList, setShowKbList] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('order');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortAnchor, setSortAnchor] = useState<null | HTMLElement>(null);
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; entry: { id: number; drug: string; symptom: string; source?: string } | null }>({ open: false, entry: null });
  
  const getHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-User-Email': user?.email || '',
      'X-User-Name': user?.name || '',
      'X-User-Role': user?.role || ''
    };
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const { data: stats, isLoading } = useQuery<SystemStats>(
    'systemStats',
    () => axios.get('http://localhost:5000/api/admin/analytics', { headers: getHeaders() }).then(res => res.data),
    { refetchInterval: 30000 },
  );

  const { data: kbEntries, refetch } = useQuery(
    'systemKb',
    () => axios.get('http://localhost:5000/api/admin/kb/approved', { headers: getHeaders() }).then(res => res.data),
    { enabled: showKbList },
  );

  const deleteEntry = useMutation(
    ({ entryId, source }: { entryId: number; source: string }) => axios.delete(`http://localhost:5000/api/admin/kb/${entryId}?source=${source}`, { headers: getHeaders() }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('systemKb');
        queryClient.invalidateQueries('systemStats');
        if (showDuplicatesOnly) {
          setShowDuplicatesOnly(false);
        }
      },
    }
  );

  const handleDelete = (entryId: number, drug: string, symptom: string, source: string = 'medical_kb') => {
    setDeleteDialog({ open: true, entry: { id: entryId, drug, symptom, source } });
  };

  const confirmDelete = () => {
    if (deleteDialog.entry) {
      deleteEntry.mutate({ entryId: deleteDialog.entry.id, source: deleteDialog.entry.source || 'medical_kb' });
      setDeleteDialog({ open: false, entry: null });
    }
  };

  const sortedEntries = useMemo(() => {
    if (!kbEntries || !Array.isArray(kbEntries)) return [];
    let entries = [...kbEntries];
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      entries = entries.filter(e => 
        (e.drug || '').toLowerCase().includes(search) ||
        (e.symptom || '').toLowerCase().includes(search)
      );
    }

    switch (sortBy) {
      case 'alpha_asc':
        entries.sort((a, b) => (a.drug || '').localeCompare(b.drug || ''));
        break;
      case 'alpha_desc':
        entries.sort((b, a) => (a.drug || '').localeCompare(b.drug || ''));
        break;
      case 'auto_first':
        entries.sort((a, b) => (b.is_auto_generated || 0) - (a.is_auto_generated || 0));
        break;
      case 'auto_last':
        entries.sort((a, b) => (a.is_auto_generated || 0) - (b.is_auto_generated || 0));
        break;
      case 'order':
      default:
        entries.sort((a, b) => (a.id || 0) - (b.id || 0));
        break;
    }
    return entries;
  }, [kbEntries, sortBy, searchTerm]);

  const getDuplicateKey = (entry: any) => {
    if (!entry) return null;
    const drug = String(entry.drug || '').toLowerCase().trim();
    const symptom = String(entry.symptom || '').toLowerCase().trim();
    if (!drug || !symptom) return null;
    return `${drug}|${symptom}`;
  };

  const duplicateKeys = useMemo((): Set<string> => {
    if (!kbEntries || !Array.isArray(kbEntries)) return new Set();
    const seen = new Map<string, number>();
    const dupKeys = new Set<string>();
    
    kbEntries.forEach((entry: any, idx: number) => {
      const key = getDuplicateKey(entry);
      if (!key) return;
      if (seen.has(key)) {
        dupKeys.add(key);
      } else {
        seen.set(key, idx);
      }
    });
    return dupKeys;
  }, [kbEntries]);

  const displayedEntries = useMemo(() => {
    if (!showDuplicatesOnly) return sortedEntries;
    if (!sortedEntries || !Array.isArray(sortedEntries)) return [];
    
    const duplicates: any[] = [];
    
    sortedEntries.forEach((entry: any) => {
      const key = getDuplicateKey(entry);
      if (key && duplicateKeys.has(key)) {
        duplicates.push(entry);
      }
    });
    
    console.log('displayedEntries (duplicates only):', duplicates.length);
    return duplicates;
  }, [sortedEntries, duplicateKeys, showDuplicatesOnly]);

  const duplicateCount = useMemo(() => {
    if (!kbEntries || !Array.isArray(kbEntries)) return 0;
    // Count total entries that are duplicates
    let count = 0;
    kbEntries.forEach((entry: any) => {
      const key = getDuplicateKey(entry);
      if (key && duplicateKeys.has(key)) {
        count++;
      }
    });
    return count;
  }, [kbEntries, duplicateKeys]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }

  const userPieData = [
    { name: 'Active', value: stats?.activeUsers ?? 0 },
    { name: 'Inactive', value: (stats?.totalUsers ?? 0) - (stats?.activeUsers ?? 0) },
  ];

  return (
    <Box>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="800" color="white" gutterBottom>
          System Analytics
        </Typography>
        <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.6)', maxWidth: 600 }}>
          Overview of system performance, user engagement, and knowledge base growth.
        </Typography>
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={3} sx={{ mb: 5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Total Users"
            value={stats?.totalUsers ?? 0}
            icon={<PeopleIcon />}
            color="#2196f3"
            gradient="linear-gradient(135deg, #2196f3 0%, #0d47a1 100%)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Total Chats"
            value={stats?.totalChats ?? 0}
            icon={<ChatIcon />}
            color="#00c853"
            gradient="linear-gradient(135deg, #00c853 0%, #1b5e20 100%)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="KB Entries"
            value={stats?.totalKbEntries ?? 0}
            icon={<KbIcon />}
            color="#d32f2f"
            gradient="linear-gradient(135deg, #f44336 0%, #d32f2f 100%)"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Pending Tasks"
            value={stats?.pendingApprovals ?? 0}
            icon={<PendingIcon />}
            color="#ff9800"
            gradient="linear-gradient(135deg, #ffb74d 0%, #ff9800 100%)"
          />
        </Grid>
      </Grid>

      {/* KB Entries Management Section */}
      <Paper sx={{ 
        p: 3, 
        mb: 5, 
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 4,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        overflow: 'hidden'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: showKbList ? 3 : 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1, bgcolor: 'rgba(156, 39, 176, 0.1)', borderRadius: 2, display: 'flex' }}>
              <KbIcon sx={{ color: '#9c27b0' }} />
            </Box>
            <Typography variant="h6" fontWeight="700" color="white">
              Knowledge Base Management
            </Typography>
            {duplicateCount > 0 && (
              <Chip
                icon={<WarningIcon sx={{ color: '#ff9800 !important' }} />}
                label={`${duplicateCount} Duplicates Found`}
                size="small"
                onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
                sx={{ 
                  cursor: 'pointer', 
                  fontWeight: 700,
                  bgcolor: 'rgba(255, 152, 0, 0.15)',
                  color: '#ffb74d',
                  border: '1px solid rgba(255, 152, 0, 0.3)'
                }}
              />
            )}
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={showKbList}
                onChange={(e) => setShowKbList(e.target.checked)}
                color="secondary"
              />
            }
            label={
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                View Database
              </Typography>
            }
          />
        </Box>
        
        {showKbList && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <TextField
                size="small"
                placeholder="Search drug or symptom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ minWidth: 250 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<SortIcon />}
                onClick={(e) => setSortAnchor(e.currentTarget)}
                sx={{ textTransform: 'none' }}
              >
                Sort: {sortBy === 'order' ? 'Order Saved' : sortBy === 'alpha_asc' ? 'A-Z' : 'Z-A'}
              </Button>
              <Menu
                anchorEl={sortAnchor}
                open={Boolean(sortAnchor)}
                onClose={() => setSortAnchor(null)}
              >
                <MenuItem 
                  onClick={() => { setSortBy('order'); setSortAnchor(null); }}
                  selected={sortBy === 'order'}
                >
                  <ListItemIcon><OrderIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>Order Saved</ListItemText>
                </MenuItem>
                <MenuItem 
                  onClick={() => { setSortBy('alpha_asc'); setSortAnchor(null); }}
                  selected={sortBy === 'alpha_asc'}
                >
                  <ListItemIcon><AscIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>Alphabetical (A-Z)</ListItemText>
                </MenuItem>
                <MenuItem 
                  onClick={() => { setSortBy('alpha_desc'); setSortAnchor(null); }}
                  selected={sortBy === 'alpha_desc'}
                >
                  <ListItemIcon><DescIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>Alphabetical (Z-A)</ListItemText>
                </MenuItem>
                <MenuItem 
                  onClick={() => { setSortBy('auto_first'); setSortAnchor(null); }}
                  selected={sortBy === 'auto_first'}
                >
                  <ListItemIcon><KbIcon fontSize="small" sx={{ color: '#9c27b0' }} /></ListItemIcon>
                  <ListItemText>Auto Added First</ListItemText>
                </MenuItem>
                <MenuItem 
                  onClick={() => { setSortBy('auto_last'); setSortAnchor(null); }}
                  selected={sortBy === 'auto_last'}
                >
                  <ListItemIcon><KbIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>Manual Added First</ListItemText>
                </MenuItem>
              </Menu>
              <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center', ml: 'auto' }}>
                {displayedEntries.length} {showDuplicatesOnly ? 'duplicates' : 'entries'}{!showDuplicatesOnly && sortedEntries.length !== (kbEntries?.length || 0) ? ` of ${kbEntries?.length}` : ''}
              </Typography>
            </Box>

            {displayedEntries.length === 0 && kbEntries && kbEntries.length > 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {showDuplicatesOnly ? 'No duplicate entries.' : 'No entries match your search.'}
              </Alert>
            )}

            <TableContainer sx={{ 
              maxHeight: 450,
              borderRadius: 3,
              border: '1px solid rgba(255, 255, 255, 0.05)',
              '&::-webkit-scrollbar': { width: '8px' },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '4px' }
            }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: '#1a1a20', color: 'rgba(255,255,255,0.7)', fontWeight: 600, borderBottom: '1px solid #2e2e36' }}>Drug</TableCell>
                    <TableCell sx={{ bgcolor: '#1a1a20', color: 'rgba(255,255,255,0.7)', fontWeight: 600, borderBottom: '1px solid #2e2e36' }}>Symptom</TableCell>
                    <TableCell sx={{ bgcolor: '#1a1a20', color: 'rgba(255,255,255,0.7)', fontWeight: 600, borderBottom: '1px solid #2e2e36' }}>Mechanism</TableCell>
                    <TableCell sx={{ bgcolor: '#1a1a20', color: 'rgba(255,255,255,0.7)', fontWeight: 600, borderBottom: '1px solid #2e2e36', width: 80, textAlign: 'center' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedEntries.map((entry: any, index: number) => {
                    const key = getDuplicateKey(entry);
                    const isDuplicate = !!(key && duplicateKeys.has(key));
                    return (
                      <TableRow 
                        key={`${entry.id || 'no-id'}-${entry.symptom || ''}-${index}`}
                        sx={{ 
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          bgcolor: isDuplicate ? 'rgba(255, 152, 0, 0.05)' : 'transparent',
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' }
                        }}
                      >
                        <TableCell sx={{ fontWeight: 500 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {isDuplicate && !showDuplicatesOnly && (
                              <MuiTooltip title="Duplicate entry">
                                <span>
                                  <WarningIcon sx={{ fontSize: 16, color: 'warning.main', cursor: 'pointer' }} />
                                </span>
                              </MuiTooltip>
                            )}
                            {entry.drug || '-'}
                            {entry.is_auto_generated === 1 && (
                              <Chip label="Auto" size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#9c27b0', color: 'white' }} />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: 'rgba(255,255,255,0.8)' }}>{entry.symptom || '-'}</TableCell>
                        <TableCell sx={{ color: 'rgba(255,255,255,0.5)', maxWidth: 300 }}>
                          {entry.mechanism ? entry.mechanism.substring(0, 60) + (entry.mechanism.length > 60 ? '...' : '') : '-'}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            sx={{ 
                              color: 'rgba(255, 82, 82, 0.5)',
                              '&:hover': { color: '#ff5252', bgcolor: 'rgba(255, 82, 82, 0.1)' }
                            }}
                            onClick={() => handleDelete(entry.id, entry.drug, entry.symptom, entry.source)}
                            disabled={deleteEntry.isLoading}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>

      <Grid container spacing={3}>
        {/* Chat activity chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ 
            p: 3, 
            background: 'rgba(255, 255, 255, 0.03)', 
            borderRadius: 4, 
            border: '1px solid rgba(255, 255, 255, 0.1)',
            height: '100%'
          }}>
            <Typography variant="h6" fontWeight="700" color="white" gutterBottom>
              Usage Trends
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', mb: 3, display: 'block' }}>
              Weekly message volume and interaction levels
            </Typography>
            {stats?.chatsByDay?.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.chatsByDay}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2196f3" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#2196f3" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} 
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickLine={false}
                  />
                  <YAxis 
                    allowDecimals={false} 
                    tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a20', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                    itemStyle={{ color: '#2196f3' }}
                  />
                  <Bar dataKey="count" fill="url(#barGradient)" radius={[4, 4, 0, 0]} name="Messages" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                No chat data available yet.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* User active/inactive pie */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ 
            p: 3, 
            height: '100%',
            background: 'rgba(255, 255, 255, 0.03)', 
            borderRadius: 4, 
            border: '1px solid rgba(255, 255, 255, 0.1)' 
          }}>
            <Typography variant="h6" fontWeight="700" color="white" gutterBottom>
              User Distribution
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', mb: 3, display: 'block' }}>
              Engagement status of total registered users
            </Typography>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={userPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {userPieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>{value}</span>}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a20', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Top symptoms */}
        {stats?.topSymptoms?.length ? (
          <Grid item xs={12} md={12}>
            <Paper sx={{ 
              p: 3,
              background: 'rgba(255, 255, 255, 0.03)', 
              borderRadius: 4, 
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <Typography variant="h6" fontWeight="700" color="white" gutterBottom>
                Common Health Concerns
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', mb: 3, display: 'block' }}>
                Most frequently queried symptoms by patients
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.topSymptoms} layout="vertical" margin={{ left: 40, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="symptom" 
                    type="category" 
                    width={100} 
                    tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.7)', fontWeight: 500 }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a20', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="count" fill="#9c27b0" radius={[0, 4, 4, 0]} name="Queries" barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        ) : null}
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, entry: null })}
        PaperProps={{
          sx: { 
            bgcolor: '#1a1a20',
            backgroundImage: 'none',
            borderRadius: 6,
            width: '100%',
            maxWidth: '380px',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pt: 4, pb: 2 }}>
          <Box sx={{ 
            bgcolor: 'rgba(211, 47, 47, 0.1)', 
            width: 60, height: 60, borderRadius: '50%', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto', mb: 2, border: '1px solid rgba(211, 47, 47, 0.2)'
          }}>
            <DeleteIcon sx={{ color: '#ff5252', fontSize: 32 }} />
          </Box>
          <Typography variant="h6" fontWeight="800" color="white">
            Remove from Database?
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pb: 4 }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 3 }}>
            Deleting <strong>{deleteDialog.entry?.drug}</strong> will permanently remove it from the knowledge base. This cannot be undone.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setDeleteDialog({ open: false, entry: null })}
              sx={{ 
                borderRadius: 3, py: 1.5, 
                color: 'white', borderColor: 'rgba(255,255,255,0.2)',
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.05)' }
              }}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              variant="contained"
              onClick={confirmDelete}
              sx={{ 
                borderRadius: 3, py: 1.5,
                bgcolor: '#ff5252',
                '&:hover': { bgcolor: '#ff1744' },
                boxShadow: '0 8px 16px rgba(211, 47, 47, 0.4)'
              }}
            >
              Delete
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};