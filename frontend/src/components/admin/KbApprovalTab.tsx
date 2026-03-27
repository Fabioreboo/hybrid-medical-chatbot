import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  Card,
  CardContent,
  Chip,
  Box,
  Fade,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  useTheme,
} from '@mui/material';
import { useThemeMode } from '../../contexts/ThemeContext';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

interface KbEntry {
  id: string;
  suggested_symptom: string;
  suggested_drug: string;
  suggested_mechanism?: string;
  suggested_precautions?: string;
  suggested_side_effects?: string;
  status: 'pending' | 'approved' | 'rejected';
  username?: string;
  user_email?: string;
  is_auto_generated?: number;
  created_at?: string;
  submitted_at?: string;
}

export const KbApprovalTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedEntry, setSelectedEntry] = useState<KbEntry | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showAuto, setShowAuto] = useState(false);
  const [viewMode, setViewMode] = useState<'pending' | 'approved'>('pending');
  const { darkMode } = useThemeMode();
  const theme = useTheme();

  const isDark = darkMode;
  const textColor = isDark ? '#ffffff' : '#1a1a1a';
  const secondaryTextColor = isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.65)';
  const glassBg = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.85)';
  const glassBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
  const tableHeaderBg = isDark ? 'rgba(20, 20, 25, 0.8)' : 'rgba(245, 245, 250, 0.85)';

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

  const { data: pendingEntries } = useQuery(['pendingKbEntries', showAuto], () =>
    axios.get(`http://localhost:5000/api/admin/kb_requests?include_approved=${showAuto}`, { headers: getHeaders() }).then(r => r.data || [])
  );

  const { data: approvedEntries } = useQuery('approvedKbEntries', () =>
    axios.get(`http://localhost:5000/api/admin/kb_requests/approved`, { headers: getHeaders() }).then(r => r.data || [])
  );

  const approveEntry = useMutation(
    (entryId: string) => axios.post(`http://localhost:5000/api/admin/kb_requests/${entryId}/approve`, {}, { headers: getHeaders() }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('pendingKbEntries');
        queryClient.invalidateQueries('systemKb');
        queryClient.invalidateQueries('auditLogs');
      },
    }
  );

  const rejectEntry = useMutation(
    (entryId: string) => axios.post(`http://localhost:5000/api/admin/kb_requests/${entryId}/reject`, { reason: rejectReason }, { headers: getHeaders() }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('pendingKbEntries');
        queryClient.invalidateQueries('systemKb');
        queryClient.invalidateQueries('auditLogs');
        setRejectDialogOpen(false);
        setRejectReason('');
      },
    }
  );

  const handleApprove = (entry: KbEntry) => {
    approveEntry.mutate(entry.id);
  };

  const handleReject = (entry: KbEntry) => {
    setSelectedEntry(entry);
    setRejectDialogOpen(true);
  };

  const confirmReject = () => {
    if (selectedEntry) {
      rejectEntry.mutate(selectedEntry.id);
    }
  };

  return (
    <Fade in={true} timeout={600}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 4,
        pb: 6,
        width: '100%'
      }}>
        
        {/* Header Section */}
        <Box sx={{ mt: 1 }}>
          <Box sx={{ 
            p: 4, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            borderBottom: `1px solid ${glassBorder}` 
          }}>
            <Box>
              <Typography variant="h5" fontWeight="700" color={textColor} gutterBottom>
                {viewMode === 'pending' ? 'Pending KB Approvals' : 'Recently Approved Entries'}
              </Typography>
              <Typography variant="body2" color={secondaryTextColor}>
                {viewMode === 'pending' 
                  ? 'Review and approve or reject submissions to the Medical Knowledge Base.'
                  : 'View the most recently approved additions to the Knowledge Base.'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box sx={{ 
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.05)', 
                borderRadius: '12px', 
                p: '4px',
                display: 'flex',
                gap: 1,
                border: `1px solid ${glassBorder}`
              }}>
                <Button
                  size="small"
                  onClick={() => setViewMode('pending')}
                  sx={{
                    borderRadius: '8px',
                    px: 3,
                    bgcolor: viewMode === 'pending' ? (isDark ? 'rgba(144, 202, 249, 0.1)' : 'rgba(25, 118, 210, 0.08)') : 'transparent',
                    color: viewMode === 'pending' ? (isDark ? '#90caf9' : 'primary.main') : secondaryTextColor,
                    '&:hover': { bgcolor: isDark ? 'rgba(144, 202, 249, 0.15)' : 'rgba(25, 118, 210, 0.15)' },
                    fontWeight: 600,
                    textTransform: 'none'
                  }}
                >
                  Pending
                </Button>
                <Button
                  size="small"
                  onClick={() => setViewMode('approved')}
                  sx={{
                    borderRadius: '8px',
                    px: 3,
                    bgcolor: viewMode === 'approved' ? (isDark ? 'rgba(129, 199, 132, 0.1)' : 'rgba(56, 142, 60, 0.08)') : 'transparent',
                    color: viewMode === 'approved' ? (isDark ? '#81c784' : 'success.main') : secondaryTextColor,
                    '&:hover': { bgcolor: isDark ? 'rgba(129, 199, 132, 0.15)' : 'rgba(56, 142, 60, 0.15)' },
                    fontWeight: 600,
                    textTransform: 'none'
                  }}
                >
                  Recently Approved
                </Button>
              </Box>

              {viewMode === 'pending' && (
                <FormControlLabel
                  control={
                    <Switch 
                      size="small"
                      checked={showAuto}
                      onChange={(e) => setShowAuto(e.target.checked)}
                      color="secondary"
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ color: textColor, fontWeight: 600 }}>
                      Auto-Added
                    </Typography>
                  }
                />
              )}
              
              <Chip
                label={viewMode === 'pending' 
                  ? `${pendingEntries?.filter((e: any) => e.status === 'pending').length || 0} Pending`
                  : `${approvedEntries?.length || 0} Recently Approved`}
                color={viewMode === 'pending' ? "warning" : "success"}
                variant="outlined"
                sx={{ fontWeight: 'bold', borderRadius: '12px' }}
              />
            </Box>
          </Box>
          <TableContainer sx={{
            background: glassBg,
            backdropFilter: 'blur(10px)',
          }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: tableHeaderBg, color: secondaryTextColor, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', borderBottom: `1px solid ${glassBorder}`, position: 'sticky', top: 0, zIndex: 1 }}>Symptom</TableCell>
                  <TableCell sx={{ bgcolor: tableHeaderBg, color: secondaryTextColor, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', borderBottom: `1px solid ${glassBorder}`, position: 'sticky', top: 0, zIndex: 1 }}>Drug</TableCell>
                  <TableCell sx={{ bgcolor: tableHeaderBg, color: secondaryTextColor, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', borderBottom: `1px solid ${glassBorder}`, position: 'sticky', top: 0, zIndex: 1 }}>Status</TableCell>
                  <TableCell sx={{ bgcolor: tableHeaderBg, color: secondaryTextColor, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', borderBottom: `1px solid ${glassBorder}`, position: 'sticky', top: 0, zIndex: 1 }}>Submitted By</TableCell>
                  <TableCell sx={{ bgcolor: tableHeaderBg, color: secondaryTextColor, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', borderBottom: `1px solid ${glassBorder}`, position: 'sticky', top: 0, zIndex: 1 }}>Date</TableCell>
                  <TableCell sx={{ bgcolor: tableHeaderBg, color: secondaryTextColor, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', borderBottom: `1px solid ${glassBorder}`, width: 140, position: 'sticky', top: 0, zIndex: 1 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {viewMode === 'pending' ? (
                  <>
                    {pendingEntries?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 6, color: secondaryTextColor, borderBottom: `1px solid ${glassBorder}` }}>
                          No pending approvals at the moment.
                        </TableCell>
                      </TableRow>
                    )}
                    {pendingEntries?.map((entry: KbEntry) => (
                      <TableRow
                        key={entry.id}
                        sx={{
                          transition: 'all 0.2s',
                          '&:hover': { bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' },
                          '& td': { borderBottom: `1px solid ${glassBorder}` }
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight="600" color={textColor}>
                            {entry.suggested_symptom}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={entry.suggested_drug}
                              size="small"
                              sx={{
                                bgcolor: isDark ? 'rgba(144, 202, 249, 0.1)' : 'rgba(25, 118, 210, 0.05)',
                                color: isDark ? '#90caf9' : '#1976d2',
                                fontWeight: 'bold',
                                borderColor: isDark ? 'rgba(144, 202, 249, 0.3)' : 'rgba(25, 118, 210, 0.2)',
                                border: '1px solid'
                              }}
                            />
                            {entry.is_auto_generated === 1 && (
                              <Chip 
                                label="Auto" 
                                size="small" 
                                sx={{ 
                                  height: 20, 
                                  fontSize: '0.65rem', 
                                  bgcolor: isDark ? 'rgba(156, 39, 176, 0.2)' : 'rgba(156, 39, 176, 0.1)', 
                                  color: isDark ? '#d1c4e9' : '#7b1fa2',
                                  border: `1px solid ${isDark ? 'rgba(156, 39, 176, 0.4)' : 'rgba(156, 39, 176, 0.2)'}`,
                                  fontWeight: 'bold'
                                }} 
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={entry.status.toUpperCase()}
                            size="small"
                            color="warning"
                            sx={{ fontSize: '0.7rem', height: 20, fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: secondaryTextColor }}>{entry.username || 'Unknown User'}</TableCell>
                        <TableCell sx={{ color: secondaryTextColor }}>{format(new Date(entry.submitted_at || entry.created_at || new Date()), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              variant="contained"
                              size="small"
                              color="success"
                              onClick={() => handleApprove(entry)}
                              disabled={approveEntry.isLoading}
                              sx={{
                                minWidth: 'auto', p: '6px', borderRadius: 2,
                                boxShadow: '0 4px 14px rgba(46, 125, 50, 0.4)'
                              }}
                            >
                              <ApproveIcon fontSize="small" />
                            </Button>
                            <Button
                              variant="contained"
                              size="small"
                              color="error"
                              onClick={() => handleReject(entry)}
                              disabled={rejectEntry.isLoading}
                              sx={{
                                minWidth: 'auto', p: '6px', borderRadius: 2,
                                boxShadow: '0 4px 14px rgba(211, 47, 47, 0.4)'
                              }}
                            >
                              <RejectIcon fontSize="small" />
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : (
                  <>
                    {approvedEntries?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 6, color: secondaryTextColor, borderBottom: `1px solid ${glassBorder}` }}>
                          No recently approved entries.
                        </TableCell>
                      </TableRow>
                    )}
                    {approvedEntries?.slice(0, 10).map((entry: KbEntry) => (
                      <TableRow
                        key={entry.id}
                        sx={{
                          transition: 'all 0.2s',
                          '&:hover': { bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' },
                          '& td': { borderBottom: `1px solid ${glassBorder}` }
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight="600" color={textColor}>
                            {entry.suggested_symptom}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={entry.suggested_drug}
                            size="small"
                            sx={{
                              bgcolor: isDark ? 'rgba(129, 199, 132, 0.1)' : 'rgba(76, 175, 80, 0.05)',
                              color: isDark ? '#81c784' : '#2e7d32',
                              fontWeight: 'bold',
                              borderColor: isDark ? 'rgba(129, 199, 132, 0.3)' : 'rgba(76, 175, 80, 0.2)',
                              border: '1px solid'
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label="APPROVED"
                            size="small"
                            color="success"
                            sx={{ fontSize: '0.7rem', height: 20, fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: secondaryTextColor }}>{entry.username || 'System'}</TableCell>
                        <TableCell sx={{ color: secondaryTextColor }}>{format(new Date(entry.submitted_at || entry.created_at || new Date()), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ color: theme.palette.success.main, fontStyle: 'italic', fontWeight: 600 }}>
                            Verified
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
              </TableBody>
            </Table>
           </TableContainer>
        </Box>

        {/* Reject Dialog */}
        <Dialog
          open={rejectDialogOpen}
          onClose={() => setRejectDialogOpen(false)}
          PaperProps={{
            sx: {
              bgcolor: isDark ? 'rgba(30,30,36,0.95)' : 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(15px)',
              backgroundImage: 'none',
              borderRadius: 4,
              border: `1px solid ${glassBorder}`,
            }
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ color: textColor, fontWeight: 700 }}>Reject Knowledge Base Entry</DialogTitle>
          <DialogContent>
            <Alert
              severity="warning"
              sx={{
                mb: 3, mt: 1, borderRadius: 2,
              bgcolor: isDark ? 'rgba(237, 108, 2, 0.1)' : 'rgba(237, 108, 2, 0.05)',
              color: isDark ? '#ff9800' : '#e65100',
              '& .MuiAlert-icon': { color: isDark ? '#ff9800' : '#ef6c00' }
            }}
          >
            Please provide a reason for rejection. This will be sent to the user who submitted the entry.
          </Alert>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Reason (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: textColor,
                  '& fieldset': { borderColor: glassBorder },
                  '&:hover fieldset': { borderColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' },
                  '&.Mui-focused fieldset': { borderColor: 'primary.main' }
                },
                '& .MuiInputLabel-root': { color: secondaryTextColor }
              }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button onClick={() => setRejectDialogOpen(false)} sx={{ color: secondaryTextColor }}>
              Cancel
            </Button>
            <Button
              onClick={confirmReject}
              variant="contained"
              color="error"
              disabled={!rejectReason.trim()}
              sx={{ borderRadius: 2, px: 3 }}
            >
              Reject Submission
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Fade>
  );
};
