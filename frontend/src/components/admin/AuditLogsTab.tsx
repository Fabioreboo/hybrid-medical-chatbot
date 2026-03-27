import React, { useState, useMemo } from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Chip,
  Fade,
  Avatar,
  Tooltip,
  IconButton,
  Popover,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  FormControl,
  InputAdornment,
  Select,
  MenuItem,
  InputLabel,
  useTheme
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  Code as CodeIcon,
  TableChart as TableChartIcon
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeMode } from '../../contexts/ThemeContext';

interface AuditLog {
  id: string;
  user_id: string;
  username: string;
  user_email: string;
  log_type: 'user_query' | 'admin_action';
  action?: string;
  details?: string;
  symptom_detected?: string;
  user_message?: string;
  was_kb_hit?: boolean;
  created_at: string;
}

export const AuditLogsTab: React.FC = () => {
  const { user } = useAuth();
  const { darkMode } = useThemeMode();
  const theme = useTheme();
  
  const [dateFilter, setDateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'admin_action' | 'user_query'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const isDark = darkMode;
  const textColor = isDark ? '#ffffff' : '#1a1a1a';
  const secondaryTextColor = isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.65)';
  const glassBg = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.85)';
  const glassBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
  const tableHeaderBg = isDark ? 'rgba(20, 20, 25, 0.8)' : 'rgba(245, 245, 250, 0.85)';
  const popoverBg = isDark ? '#1a1a20' : '#ffffff';

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

  const { data: auditLogs } = useQuery('auditLogs', () =>
    axios.get('http://localhost:5000/api/admin/audit/logs', { headers: getHeaders() })
      .then(r => r.data || { logs: [] })
  );

  const filteredLogs = useMemo(() => {
    if (!auditLogs?.logs) return [];
    let logs = auditLogs.logs;
    
    if (dateFilter) {
      logs = logs.filter((log: AuditLog) => {
        try {
          const logDate = new Date(log.created_at || new Date());
          const logDateStr = format(logDate, 'yyyy-MM-dd');
          return logDateStr === dateFilter;
        } catch(e) {
          return false;
        }
      });
    }

    if (typeFilter !== 'all') {
      logs = logs.filter((log: AuditLog) => log.log_type === typeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      logs = logs.filter((log: AuditLog) => {
        const usernameMatch = log.username?.toLowerCase().includes(q);
        const actionMatch = log.action?.toLowerCase().includes(q);
        const msgMatch = log.user_message?.toLowerCase().includes(q);
        const detailsMatch = log.details?.toLowerCase().includes(q);
        return usernameMatch || actionMatch || msgMatch || detailsMatch;
      });
    }
    
    return logs.slice(0, 50);
  }, [auditLogs, dateFilter, typeFilter, searchQuery]);

  const handleExport = (formatType: 'json' | 'csv') => {
    const logsToExport = filteredLogs;
    if (formatType === 'json') {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logsToExport, null, 2));
      const el = document.createElement('a');
      el.setAttribute('href', dataStr);
      el.setAttribute('download', `audit_logs_${format(new Date(), 'yyyy-MM-dd')}.json`);
      document.body.appendChild(el);
      el.click();
      el.remove();
    } else {
      const headers = ['Time', 'User', 'Email', 'Log Type', 'Action/Query', 'Details'];
      const rows = logsToExport.map(l => [
        l.created_at,
        l.username || 'System',
        l.user_email || '',
        l.log_type,
        l.log_type === 'admin_action' ? l.action : l.user_message,
        l.details || ''
      ].map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(','));
      
      const csv = [headers.join(','), ...rows].join('\n');
      const dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      const el = document.createElement('a');
      el.setAttribute('href', dataStr);
      el.setAttribute('download', `audit_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(el);
      el.click();
      el.remove();
    }
    setExportOpen(false);
  };

  return (
    <Fade in={true} timeout={600}>
      <Box sx={{ width: '100%', mt: 1 }}>
        <Box sx={{ p: 4, pt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${glassBorder}` }}>
          <Box>
            <Typography variant="h5" fontWeight="700" color={textColor} gutterBottom>
              System Audit Logs
            </Typography>
            <Typography variant="body2" color={secondaryTextColor}>
              Comprehensive timeline of all major user queries and administrative actions.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <TextField
              placeholder="Search user or action..."
              variant="outlined"
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                width: 250,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: isDark ? glassBg : '#ffffff',
                  color: textColor,
                  '& fieldset': { borderColor: glassBorder },
                  '&:hover fieldset': { borderColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' },
                  '&.Mui-focused fieldset': { borderColor: 'primary.main' }
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: secondaryTextColor }} />
                  </InputAdornment>
                ),
              }}
            />

            <Tooltip title="Filter Logs">
              <IconButton 
                onClick={(e) => setFilterAnchorEl(e.currentTarget)}
                sx={{ 
                  bgcolor: (dateFilter || typeFilter !== 'all' || searchQuery) ? (isDark ? 'primary.dark' : 'rgba(25, 118, 210, 0.1)') : glassBg, 
                  color: (dateFilter || typeFilter !== 'all' || searchQuery) ? (isDark ? 'white' : 'primary.main') : textColor,
                  border: '1px solid',
                  borderColor: (dateFilter || typeFilter !== 'all' || searchQuery) ? 'primary.main' : glassBorder,
                  '&:hover': { bgcolor: (dateFilter || typeFilter !== 'all' || searchQuery) ? (isDark ? 'primary.main' : 'rgba(25, 118, 210, 0.2)') : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                }}
              >
                <FilterListIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Export Logs">
              <IconButton 
                onClick={() => setExportOpen(true)}
                sx={{ 
                  bgcolor: glassBg, 
                  color: textColor,
                  border: `1px solid ${glassBorder}`,
                  '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                }}
              >
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Chip 
              label={`${filteredLogs.length} Events`} 
              variant="outlined" 
              sx={{ 
                fontWeight: 'bold', 
                borderRadius: '12px',
                color: theme.palette.info.main,
                borderColor: `${theme.palette.info.main}44`,
                bgcolor: isDark ? `${theme.palette.info.main}11` : `${theme.palette.info.main}08`,
              }} 
            />
          </Box>
        </Box>

        <Popover
          open={Boolean(filterAnchorEl)}
          anchorEl={filterAnchorEl}
          onClose={() => setFilterAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{
            sx: {
              mt: 1, p: 2, bgcolor: popoverBg, border: `1px solid ${glassBorder}`,
              borderRadius: 3, color: textColor, width: 280,
              boxShadow: isDark ? '0 10px 40px rgba(0,0,0,0.5)' : '0 10px 40px rgba(0,0,0,0.1)'
            }
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>Filter Logs</Typography>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel sx={{ color: secondaryTextColor, '&.Mui-focused': { color: 'primary.main' } }}>Filter by User</InputLabel>
            <Select
              value={typeFilter}
              label="Filter by User"
              onChange={(e) => setTypeFilter(e.target.value as any)}
              sx={{
                color: textColor,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: glassBorder },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                '& .MuiSvgIcon-root': { color: secondaryTextColor }
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    bgcolor: popoverBg,
                    color: textColor,
                    border: `1px solid ${glassBorder}`,
                    backgroundImage: 'none'
                  }
                }
              }}
            >
              <MenuItem value="all">All Users</MenuItem>
              <MenuItem value="admin_action">Admin</MenuItem>
              <MenuItem value="user_query">Users</MenuItem>
            </Select>
          </FormControl>

          <TextField
            type="date"
            fullWidth
            label="Date"
            variant="outlined"
            size="small"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: '2026-03-21' }}
            sx={{
              '& .MuiOutlinedInput-root': {
                color: textColor,
                '& fieldset': { borderColor: glassBorder },
                '&:hover fieldset': { borderColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' },
                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                '& input::-webkit-calendar-picker-indicator': { filter: isDark ? 'invert(1)' : 'none' }
              },
              '& .MuiInputLabel-root': { color: secondaryTextColor }
            }}
          />
          <Button 
            fullWidth 
            variant="outlined" 
            color="inherit" 
            size="small" 
            sx={{ mt: 2, borderColor: glassBorder, color: secondaryTextColor, textTransform: 'none' }}
            onClick={() => { setDateFilter(''); setTypeFilter('all'); setSearchQuery(''); setFilterAnchorEl(null); }}
            startIcon={<ClearIcon />}
          >
            Clear Filters
          </Button>
        </Popover>

        <Dialog 
          open={exportOpen} 
          onClose={() => setExportOpen(false)}
          PaperProps={{
            sx: {
              width: '100%',
              maxWidth: '320px',
              bgcolor: isDark ? 'rgba(20,20,25,0.95)' : '#ffffff',
              backdropFilter: 'blur(20px)',
              color: textColor,
              borderRadius: '20px',
              border: `1px solid ${glassBorder}`,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              backgroundImage: 'none'
            }
          }}
        >
          <DialogTitle sx={{ pt: 3, pb: 1.5, textAlign: 'center' }}>
            <Typography variant="subtitle1" fontWeight="800" color={textColor} gutterBottom>
              Export Audit Logs
            </Typography>
            <Typography variant="caption" sx={{ color: secondaryTextColor }}>
              Format to download system activity.
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ px: 3, pt: 1, pb: 3 }}>
            <Stack direction="row" spacing={2}>
              <Box
                onClick={() => handleExport('json')}
                sx={{
                  flex: 1, py: 2, px: 1.5, 
                  bgcolor: isDark ? 'rgba(144,202,249,0.03)' : 'rgba(25, 118, 210, 0.05)',
                  border: `1px solid ${isDark ? 'rgba(144,202,249,0.1)' : 'rgba(25, 118, 210, 0.1)'}`, 
                  borderRadius: 3,
                  textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': { 
                    bgcolor: isDark ? 'rgba(144,202,249,0.08)' : 'rgba(25, 118, 210, 0.1)',
                    transform: 'translateY(-4px) scale(1.02)', 
                    borderColor: 'primary.main', 
                    boxShadow: isDark ? '0 12px 24px rgba(144,202,249,0.2)' : '0 12px 24px rgba(25, 118, 210, 0.15)' 
                  }
                }}
              >
                <CodeIcon sx={{ fontSize: 36, color: isDark ? '#90caf9' : 'primary.main', mb: 1, opacity: 0.9 }} />
                <Typography variant="body2" fontWeight="700" color={textColor} gutterBottom>JSON</Typography>
                <Typography variant="caption" sx={{ color: secondaryTextColor, display: 'block', fontSize: '0.65rem' }}>Raw Data</Typography>
              </Box>
              <Box
                onClick={() => handleExport('csv')}
                sx={{
                  flex: 1, py: 2, px: 1.5, 
                  bgcolor: isDark ? 'rgba(206,147,216,0.03)' : 'rgba(156, 39, 176, 0.05)',
                  border: `1px solid ${isDark ? 'rgba(206,147,216,0.1)' : 'rgba(156, 39, 176, 0.1)'}`, 
                  borderRadius: 3,
                  textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': { 
                    bgcolor: isDark ? 'rgba(206,147,216,0.08)' : 'rgba(156, 39, 176, 0.1)',
                    transform: 'translateY(-4px) scale(1.02)', 
                    borderColor: 'secondary.main', 
                    boxShadow: isDark ? '0 12px 24px rgba(206,147,216,0.2)' : '0 12px 24px rgba(156, 39, 176, 0.15)'
                  }
                }}
              >
                <TableChartIcon sx={{ fontSize: 36, color: isDark ? '#ce93d8' : 'secondary.main', mb: 1, opacity: 0.9 }} />
                <Typography variant="body2" fontWeight="700" color={textColor} gutterBottom>CSV</Typography>
                <Typography variant="caption" sx={{ color: secondaryTextColor, display: 'block', fontSize: '0.65rem' }}>Spreadsheet</Typography>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0, justifyContent: 'center' }}>
            <Button 
              onClick={() => setExportOpen(false)} 
              variant="text"
              sx={{ 
                color: secondaryTextColor, 
                borderRadius: 2,
                px: 3, py: 1,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                border: '1px solid transparent',
                '&:hover': { 
                  bgcolor: glassBg, 
                  color: textColor,
                  borderColor: glassBorder
                }
              }}
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>

        <TableContainer sx={{ bgcolor: 'transparent' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ bgcolor: tableHeaderBg, color: secondaryTextColor, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', borderBottom: `1px solid ${glassBorder}` }}>Time</TableCell>
                <TableCell sx={{ bgcolor: tableHeaderBg, color: secondaryTextColor, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', borderBottom: `1px solid ${glassBorder}` }}>User</TableCell>
                <TableCell sx={{ bgcolor: tableHeaderBg, color: secondaryTextColor, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', borderBottom: `1px solid ${glassBorder}` }}>Event Type</TableCell>
                <TableCell sx={{ bgcolor: tableHeaderBg, color: secondaryTextColor, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', borderBottom: `1px solid ${glassBorder}`, width: '45%' }}>Action / Query</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.length === 0 && (
                 <TableRow>
                   <TableCell colSpan={4} align="center" sx={{ py: 6, color: secondaryTextColor, borderBottom: `1px solid ${glassBorder}` }}>
                     {dateFilter ? "No system activity found for the selected date." : "No recent system activity found."}
                   </TableCell>
                 </TableRow>
              )}
              {filteredLogs.map((log: AuditLog) => (
                <TableRow 
                  key={log.id + log.log_type}
                  sx={{ 
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' },
                    '& td': { borderBottom: `1px solid ${glassBorder}` }
                  }}
                >
                  <TableCell sx={{ color: textColor }}>
                    {format(new Date(log.created_at || new Date()), 'MMM dd yyyy, HH:mm')}
                  </TableCell>
                  
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar 
                        sx={{ 
                          bgcolor: log.log_type === 'admin_action' ? 'secondary.main' : 'primary.main',
                          width: 32, height: 32, fontWeight: 'bold', fontSize: '0.85rem',
                          color: '#ffffff',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                        }}
                      >
                        {log.username ? log.username.charAt(0).toUpperCase() : '?'}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="600" color={textColor}>
                          {log.username || 'System'}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Chip
                      icon={log.log_type === 'admin_action' ? <AdminIcon fontSize="small"/> : <SearchIcon fontSize="small"/>}
                      label={log.log_type === 'admin_action' ? 'ADMIN ACTION' : 'USER QUERY'}
                      size="small"
                      sx={{ 
                        bgcolor: log.log_type === 'admin_action' ? (isDark ? 'rgba(156, 39, 176, 0.15)' : 'rgba(156, 39, 176, 0.08)') : (isDark ? 'rgba(33, 150, 243, 0.15)' : 'rgba(33, 150, 243, 0.08)'), 
                        color: log.log_type === 'admin_action' ? (isDark ? '#ce93d8' : 'secondary.main') : (isDark ? '#90caf9' : 'primary.main'),
                        fontWeight: 'bold', fontSize: '0.65rem', letterSpacing: 0.5,
                        borderColor: log.log_type === 'admin_action' ? 'rgba(156, 39, 176, 0.3)' : 'rgba(156, 39, 176, 0.2)',
                        border: '1px solid'
                      }}
                    />
                  </TableCell>
                  
                  <TableCell sx={{ color: textColor }}>
                    {log.log_type === 'admin_action' ? (
                      <Typography variant="body2">
                        <strong style={{ color: isDark ? '#ce93d8' : theme.palette.secondary.main }}>{log.action}</strong>
                        {log.details && <span style={{ opacity: 0.7 }}> — {log.details}</span>}
                      </Typography>
                    ) : (
                      <Box>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', opacity: 0.9 }}>
                          "{log.user_message}"
                        </Typography>
                      </Box>
                    )}
                  </TableCell>

                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Fade>
  );
};
