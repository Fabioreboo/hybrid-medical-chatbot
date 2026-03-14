import React, { useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tabs,
  Tab,
  IconButton,
  TextField,
} from '@mui/material';
import {
  Person as PersonIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  History as HistoryIcon,
  BarChart as AnalyticsIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { AnalyticsTab } from '../components/AnalyticsTab';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

interface KbEntry {
  id: string;
  symptom: string;
  drug: string;
  mechanism?: string;
  precautions?: string;
  side_effects?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_by?: {
    id: string;
    email: string;
    name: string;
  };
  created_at: string;
}

interface AuditLog {
  id: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  metadata?: any;
  created_at: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

const AdminPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState<KbEntry | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Fetch all users
  const { data: users } = useQuery('adminUsers', () => axios.get('/admin/users').then(res => res.data));

  // Fetch pending KB entries
  const { data: pendingEntries } = useQuery('pendingKbEntries', () =>
    axios.get('/admin/kb/pending').then(res => res.data)
  );

  // Fetch system KB
  const { data: systemKb } = useQuery('systemKb', () =>
    axios.get('/admin/kb/system').then(res => res.data)
  );

  // Fetch audit logs
  const { data: auditLogs } = useQuery('auditLogs', () =>
    axios.get('/admin/audit/logs').then(res => res.data)
  );

  const approveEntry = useMutation(
    (entryId: string) => axios.post(`/admin/kb/${entryId}/approve`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('pendingKbEntries');
        queryClient.invalidateQueries('systemKb');
        queryClient.invalidateQueries('auditLogs');
      },
    }
  );

  const rejectEntry = useMutation(
    (entryId: string) => axios.post(`/admin/kb/${entryId}/reject`, { reason: rejectReason }),
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

  const toggleUserStatus = useMutation(
    ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      axios.post(isActive ? `/admin/users/${userId}/deactivate` : `/admin/users/${userId}/activate`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminUsers');
      },
    }
  );

  const makeAdmin = useMutation(
    (userId: string) => axios.post(`/admin/users/${userId}/admin`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminUsers');
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

  const TabPanel = (props: { children?: React.ReactNode; index: number }) => {
    return (
      <div role="tabpanel" hidden={tab !== props.index}>
        {tab === props.index && <Box sx={{ p: 3 }}>{props.children}</Box>}
      </div>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Admin Panel
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)}>
          <Tab label="User Management" icon={<PersonIcon />} iconPosition="start" />
          <Tab label="KB Approval" icon={<ApproveIcon />} iconPosition="start" />
          <Tab label="Audit Logs" icon={<HistoryIcon />} iconPosition="start" />
          <Tab label="Analytics" icon={<AnalyticsIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* User Management Tab */}
      <TabPanel index={0}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            User Management
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users?.map((user: User) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        color={user.role === 'admin' ? 'secondary' : 'primary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.is_active ? 'Active' : 'Inactive'}
                        color={user.is_active ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{format(new Date(user.created_at), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      {user.last_login ? format(new Date(user.last_login), 'MMM dd, yyyy') : 'Never'}
                    </TableCell>
                    <TableCell>
                      {user.role !== 'admin' && (
                        <Button
                          size="small"
                          onClick={() => makeAdmin.mutate(user.id)}
                          disabled={makeAdmin.isLoading}
                        >
                          Make Admin
                        </Button>
                      )}
                      <Button
                        size="small"
                        onClick={() => toggleUserStatus.mutate({ userId: user.id, isActive: user.is_active })}
                        disabled={toggleUserStatus.isLoading}
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </TabPanel>

      {/* KB Approval Tab */}
      <TabPanel index={1}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Pending Entries ({pendingEntries?.length || 0})
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Symptom</TableCell>
                  <TableCell>Drug</TableCell>
                  <TableCell>Submitted By</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingEntries?.map((entry: KbEntry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.symptom}</TableCell>
                    <TableCell>{entry.drug}</TableCell>
                    <TableCell>{entry.created_by?.name}</TableCell>
                    <TableCell>{format(new Date(entry.created_at), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleApprove(entry)}
                        disabled={approveEntry.isLoading}
                      >
                        <ApproveIcon color="success" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleReject(entry)}
                        disabled={rejectEntry.isLoading}
                      >
                        <RejectIcon color="error" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Approved Entries ({systemKb?.length || 0})
          </Typography>
          <Grid container spacing={2}>
            {systemKb?.map((entry: KbEntry) => (
              <Grid item xs={12} md={6} lg={4} key={entry.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      {entry.symptom} - {entry.drug}
                    </Typography>
                    {entry.mechanism && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        <strong>Mechanism:</strong> {entry.mechanism.substring(0, 100)}...
                      </Typography>
                    )}
                    <Chip
                      label="Approved"
                      color="success"
                      size="small"
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </TabPanel>

      {/* Audit Logs Tab */}
      <TabPanel index={2}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Recent Activity
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Resource</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditLogs?.logs?.slice(0, 50).map((log: AuditLog) => (
                  <TableRow key={log.id}>
                    <TableCell>{format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}</TableCell>
                    <TableCell>{log.user?.name}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.resource_type}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </TabPanel>

      {/* Analytics Tab */}
      <TabPanel index={3}>
        <AnalyticsTab />
      </TabPanel>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reject Knowledge Base Entry</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            Please provide a reason for rejection. This will be sent to the user who submitted the entry.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmReject} color="error" disabled={!rejectReason.trim()}>
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminPanel;