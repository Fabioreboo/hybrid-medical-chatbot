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
  InputLabel
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
  
  const [dateFilter, setDateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'admin_action' | 'user_query'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [exportOpen, setExportOpen] = useState(false);
  
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
    
    // 1. Date-based filtering with Timezone fix (using local yyyy-MM-dd)
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

    // 2. Type filtering
    if (typeFilter !== 'all') {
      logs = logs.filter((log: AuditLog) => log.log_type === typeFilter);
    }

    // 3. Search query
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
      
      const csv = [headers.join(','), ...rows].join('\\n');
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
      <Box 
        sx={{ 
          p: 0, 
        }}
      >
        <Box sx={{ p: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <Box>
            <Typography variant="h5" fontWeight="700" color="white" gutterBottom>
              System Audit Logs
            </Typography>
            <Typography variant="body2" color="rgba(255, 255, 255, 0.6)">
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
                input: { color: 'white' },
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.05)',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&.Mui-focused fieldset': { borderColor: 'primary.main' }
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.5)' }} />
                  </InputAdornment>
                ),
              }}
            />

            <Tooltip title="Filter Logs">
              <IconButton 
                onClick={(e) => setFilterAnchorEl(e.currentTarget)}
                sx={{ 
                  bgcolor: (dateFilter || typeFilter !== 'all' || searchQuery) ? 'primary.dark' : 'rgba(255,255,255,0.05)', 
                  color: 'white',
                  border: '1px solid',
                  borderColor: (dateFilter || typeFilter !== 'all' || searchQuery) ? 'primary.main' : 'transparent',
                  '&:hover': { bgcolor: (dateFilter || typeFilter !== 'all' || searchQuery) ? 'primary.main' : 'rgba(255,255,255,0.1)' }
                }}
              >
                <FilterListIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Export Logs">
              <IconButton 
                onClick={() => setExportOpen(true)}
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.05)', 
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                }}
              >
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Chip 
              label={`${filteredLogs.length} Events`} 
              color="info" 
              variant="outlined" 
              sx={{ fontWeight: 'bold', borderRadius: '12px' }} 
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
              mt: 1, p: 2, bgcolor: '#1a1a20', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 2, color: 'white', width: 280
            }
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>Filter Logs</Typography>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel sx={{ color: 'rgba(255,255,255,0.7)', '&.Mui-focused': { color: 'primary.main' } }}>Filter by User</InputLabel>
            <Select
              value={typeFilter}
              label="Filter by User"
              onChange={(e) => setTypeFilter(e.target.value as any)}
              sx={{
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' }
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    bgcolor: '#2e2e36',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.1)'
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
              input: { color: 'white', '&::-webkit-calendar-picker-indicator': { filter: 'invert(1)' } },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                '&.Mui-focused fieldset': { borderColor: 'primary.main' }
              },
              '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' }
            }}
          />
          <Button 
            fullWidth 
            variant="outlined" 
            color="inherit" 
            size="small" 
            sx={{ mt: 2, borderColor: 'rgba(255,255,255,0.1)', opacity: 0.7 }}
            onClick={() => { setDateFilter(''); setTypeFilter('all'); setSearchQuery(''); setFilterAnchorEl(null); }}
            startIcon={<ClearIcon />}
          >
            Clear Filters
          </Button>
        </Popover>

        {/* Premium Export Dialog */}
        <Dialog 
          open={exportOpen} 
          onClose={() => setExportOpen(false)}
          PaperProps={{
            sx: {
              width: '100%',
              maxWidth: '320px',
              bgcolor: '#000000',
              backdropFilter: 'blur(20px)',
              color: 'white',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }
          }}
        >
          <DialogTitle sx={{ pt: 3, pb: 1.5, textAlign: 'center' }}>
            <Typography variant="subtitle1" fontWeight="800" gutterBottom>
              Export Audit Logs
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              Format to download system activity.
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ px: 3, pt: 1, pb: 3 }}>
            <Stack direction="row" spacing={2}>
              <Box
                onClick={() => handleExport('json')}
                sx={{
                  flex: 1, py: 2, px: 1.5, 
                  bgcolor: 'rgba(144,202,249,0.03)',
                  border: '1px solid rgba(144,202,249,0.1)', 
                  borderRadius: 3,
                  textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': { 
                    bgcolor: 'rgba(144,202,249,0.08)',
                    transform: 'translateY(-4px) scale(1.02)', 
                    borderColor: 'primary.main', 
                    boxShadow: '0 12px 24px rgba(144,202,249,0.2)' 
                  }
                }}
              >
                <CodeIcon sx={{ fontSize: 36, color: '#90caf9', mb: 1, opacity: 0.9 }} />
                <Typography variant="body2" fontWeight="700" color="white" gutterBottom>JSON</Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', fontSize: '0.65rem' }}>Raw Data</Typography>
              </Box>
              <Box
                onClick={() => handleExport('csv')}
                sx={{
                  flex: 1, py: 2, px: 1.5, 
                  bgcolor: 'rgba(206,147,216,0.03)',
                  border: '1px solid rgba(206,147,216,0.1)', 
                  borderRadius: 3,
                  textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': { 
                    bgcolor: 'rgba(206,147,216,0.08)',
                    transform: 'translateY(-4px) scale(1.02)', 
                    borderColor: 'secondary.main', 
                    boxShadow: '0 12px 24px rgba(206,147,216,0.2)' 
                  }
                }}
              >
                <TableChartIcon sx={{ fontSize: 36, color: '#ce93d8', mb: 1, opacity: 0.9 }} />
                <Typography variant="body2" fontWeight="700" color="white" gutterBottom>CSV</Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', fontSize: '0.65rem' }}>Spreadsheet</Typography>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0, justifyContent: 'center' }}>
            <Button 
              onClick={() => setExportOpen(false)} 
              variant="text"
              sx={{ 
                color: 'rgba(255,255,255,0.5)', 
                borderRadius: 2,
                px: 3, py: 1,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                border: '1px solid transparent',
                '&:hover': { 
                  bgcolor: 'rgba(255,255,255,0.05)', 
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ bgcolor: '#1a1a20', color: 'rgba(255,255,255,0.7)', fontWeight: 600, borderBottom: '1px solid #2e2e36', width: 160 }}>Time</TableCell>
                <TableCell sx={{ bgcolor: '#1a1a20', color: 'rgba(255,255,255,0.7)', fontWeight: 600, borderBottom: '1px solid #2e2e36' }}>User</TableCell>
                <TableCell sx={{ bgcolor: '#1a1a20', color: 'rgba(255,255,255,0.7)', fontWeight: 600, borderBottom: '1px solid #2e2e36' }}>Event Type</TableCell>
                <TableCell sx={{ bgcolor: '#1a1a20', color: 'rgba(255,255,255,0.7)', fontWeight: 600, borderBottom: '1px solid #2e2e36', width: '45%' }}>Action / Query</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.length === 0 && (
                 <TableRow>
                   <TableCell colSpan={4} align="center" sx={{ py: 6, color: 'rgba(255,255,255,0.4)' }}>
                     {dateFilter ? "No system activity found for the selected date." : "No recent system activity found."}
                   </TableCell>
                 </TableRow>
              )}
              {filteredLogs.map((log: AuditLog) => (
                <TableRow 
                  key={log.id + log.log_type}
                  sx={{ 
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.03)' },
                    '& td': { borderBottom: '1px solid #2e2e36' }
                  }}
                >
                  <TableCell sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    {/* 2. Full Year Timestamps for clarity */}
                    {format(new Date(log.created_at || new Date()), 'MMM dd yyyy, HH:mm')}
                  </TableCell>
                  
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar 
                        sx={{ 
                          bgcolor: log.log_type === 'admin_action' ? 'secondary.dark' : 'primary.dark',
                          width: 32, height: 32, fontWeight: 'bold', fontSize: '0.85rem' 
                        }}
                      >
                        {log.username ? log.username.charAt(0).toUpperCase() : '?'}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="600" color="white">
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
                        bgcolor: log.log_type === 'admin_action' ? 'rgba(156, 39, 176, 0.15)' : 'rgba(33, 150, 243, 0.15)', 
                        color: log.log_type === 'admin_action' ? '#ce93d8' : '#90caf9',
                        fontWeight: 'bold', fontSize: '0.65rem', letterSpacing: 0.5,
                        borderColor: log.log_type === 'admin_action' ? 'rgba(206, 147, 216, 0.3)' : 'rgba(144, 202, 249, 0.3)',
                        border: '1px solid'
                      }}
                    />
                  </TableCell>
                  
                  <TableCell sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    {log.log_type === 'admin_action' ? (
                      <Typography variant="body2">
                        <strong style={{ color: '#ce93d8' }}>{log.action}</strong>
                        {log.details && <span style={{ opacity: 0.7 }}> — {log.details}</span>}
                      </Typography>
                    ) : (
                      <Box>
                        {/* 4. Simplified User Message Display (No symptom chip) */}
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
