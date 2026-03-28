import React from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Box,
  Fade,
  Avatar,
  IconButton,
  Tooltip,
  Dialog,
  Zoom,
  useTheme,
} from '@mui/material';
import { useThemeMode } from '../../contexts/ThemeContext';
import {
  AdminPanelSettings as AdminIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

// Match backend SQLite response exactly
interface User {
  id: string;
  email: string;
  username: string;
  is_banned: number; // SQLite boolean (0 or 1)
  created_at: string;
  query_count: number;
}

export const UserManagementTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
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
      'X-User-Email': currentUser?.email || '',
      'X-User-Name': currentUser?.name || '',
      'X-User-Role': currentUser?.role || ''
    };
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const { data: users } = useQuery('adminUsers', () => 
    axios.get('http://localhost:5000/api/admin/users', { headers: getHeaders() }).then(r => r.data || [])
  );

  const toggleUserStatus = useMutation(
    ({ userId, isBanned }: { userId: string; isBanned: boolean }) =>
      axios.post(isBanned ? `http://localhost:5000/api/admin/users/${userId}/unban` : `http://localhost:5000/api/admin/users/${userId}/ban`, {}, { headers: getHeaders() }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminUsers');
      },
    }
  );

  const deleteUserMutation = useMutation(
    (userId: string) => axios.delete(`http://localhost:5000/api/admin/users/${userId}`, { headers: getHeaders() }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminUsers');
      },
    }
  );

  const [userToDelete, setUserToDelete] = React.useState<User | null>(null);

  return (
    <Fade in={true} timeout={600}>
      <Box sx={{ width: '100%', mt: 1 }}>
        <Box sx={{ 
          p: 4, 
          pt: 2, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          borderBottom: `1px solid ${glassBorder}` 
        }}>
          <Box>
            <Typography variant="h5" fontWeight="700" color={textColor} gutterBottom>
              User Management
            </Typography>
            <Typography variant="body2" color={secondaryTextColor}>
              Manage access, roles, and status of global registered users.
            </Typography>
          </Box>
          <Chip 
            label={`${users?.length || 0} Total Users`} 
            variant="outlined" 
            sx={{ 
              fontWeight: 'bold', 
              borderRadius: '12px',
              color: theme.palette.primary.main,
              borderColor: `${theme.palette.primary.main}44`,
              bgcolor: isDark ? `${theme.palette.primary.main}11` : `${theme.palette.primary.main}08`,
            }} 
          />
        </Box>

        <TableContainer sx={{ 
          overflowX: 'auto',
          background: glassBg,
          backdropFilter: 'blur(10px)',
          borderRadius: 0,
          boxShadow: isDark ? 'none' : 'inset 0 0 40px rgba(0,0,0,0.02)'
        }}>
          <Table sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ bgcolor: tableHeaderBg, color: secondaryTextColor, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', borderBottom: `1px solid ${glassBorder}`, position: 'sticky', top: 0, zIndex: 1 }}>User</TableCell>
                <TableCell sx={{ bgcolor: tableHeaderBg, color: secondaryTextColor, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', borderBottom: `1px solid ${glassBorder}`, position: 'sticky', top: 0, zIndex: 1 }}>Queries</TableCell>
                <TableCell sx={{ bgcolor: tableHeaderBg, color: secondaryTextColor, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', borderBottom: `1px solid ${glassBorder}`, position: 'sticky', top: 0, zIndex: 1 }}>Status</TableCell>
                <TableCell sx={{ bgcolor: tableHeaderBg, color: secondaryTextColor, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', borderBottom: `1px solid ${glassBorder}`, position: 'sticky', top: 0, zIndex: 1 }}>Joined</TableCell>
                <TableCell sx={{ bgcolor: tableHeaderBg, color: secondaryTextColor, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', borderBottom: `1px solid ${glassBorder}`, width: 220, position: 'sticky', top: 0, zIndex: 1 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users?.map((user: User) => (
                <TableRow 
                  key={user.id} 
                  sx={{ 
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' },
                    '& td': { borderBottom: `1px solid ${glassBorder}` }
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar 
                        sx={{ 
                          bgcolor: 'primary.dark',
                          width: 36, height: 36, fontWeight: 'bold', fontSize: '0.9rem' 
                        }}
                      >
                        {user.username ? user.username.charAt(0).toUpperCase() : '?'}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" component="span" fontWeight="600" color={textColor} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {user.username || 'System User'}
                          {user.email === currentUser?.email && (
                            <Chip label="YOU" size="small" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 'bold', bgcolor: theme.palette.secondary.main, color: 'white' }} />
                          )}
                        </Typography>
                        <Typography variant="caption" color={secondaryTextColor}>
                          {user.email || 'No Email'}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color={textColor} fontWeight="bold">
                        {user.query_count || 0}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={!user.is_banned ? 'ACTIVE' : 'SUSPENDED'}
                      color={!user.is_banned ? 'success' : 'error'}
                      size="small"
                      sx={{ 
                        fontWeight: 'bold', 
                        fontSize: '0.7rem', 
                        height: 22,
                        bgcolor: !user.is_banned 
                          ? (isDark ? 'rgba(46, 125, 50, 0.15)' : 'rgba(46, 125, 50, 0.08)')
                          : (isDark ? 'rgba(211, 47, 47, 0.15)' : 'rgba(211, 47, 47, 0.08)'),
                        color: !user.is_banned 
                          ? (isDark ? '#66bb6a' : '#2e7d32')
                          : (isDark ? '#ef5350' : '#c62828'),
                        border: '1px solid',
                        borderColor: !user.is_banned 
                          ? (isDark ? 'rgba(102, 187, 106, 0.3)' : 'rgba(46, 125, 50, 0.2)')
                          : (isDark ? 'rgba(239, 83, 80, 0.3)' : 'rgba(211, 47, 47, 0.2)')
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: secondaryTextColor }}>
                    {format(new Date(user.created_at || new Date()), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title={user.email === currentUser?.email ? "Cannot ban self" : (!user.is_banned ? 'Ban User' : 'Unban User')} arrow placement="top">
                        <span>
                          <Button
                            size="small"
                            variant="outlined"
                            color={!user.is_banned ? 'error' : 'success'}
                            onClick={() => toggleUserStatus.mutate({ userId: user.id, isBanned: Boolean(user.is_banned) })}
                            disabled={toggleUserStatus.isLoading || user.email === currentUser?.email}
                            sx={{ 
                              fontWeight: 'bold',
                              fontSize: '0.8rem',
                              height: 32,
                              borderRadius: 2,
                              px: 3,
                              bgcolor: !user.is_banned ? 'rgba(211, 47, 47, 0.1)' : 'rgba(76, 175, 80, 0.1)',
                              borderColor: !user.is_banned ? 'rgba(211, 47, 47, 0.4)' : 'rgba(76, 175, 80, 0.4)',
                              '&:hover': { 
                                bgcolor: !user.is_banned ? 'rgba(211, 47, 47, 0.2)' : 'rgba(76, 175, 80, 0.2)',
                                borderColor: !user.is_banned ? 'error.main' : 'success.main',
                                boxShadow: !user.is_banned ? '0 4px 12px rgba(211, 47, 47, 0.3)' : '0 4px 12px rgba(76, 175, 80, 0.3)'
                              },
                              opacity: user.email === currentUser?.email ? 0.3 : 1
                            }}
                          >
                            {!user.is_banned ? 'BAN' : 'UNBAN'}
                          </Button>
                        </span>
                      </Tooltip>
                      <Tooltip title={user.email === currentUser?.email ? "Cannot delete self" : "Delete User"} arrow placement="top">
                        <span>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => setUserToDelete(user)}
                            disabled={deleteUserMutation.isLoading || user.email === currentUser?.email}
                            sx={{ 
                              fontWeight: 'bold',
                              fontSize: '0.8rem',
                              height: 32,
                              minWidth: 'auto',
                              borderRadius: 2,
                              px: 1,
                              bgcolor: 'rgba(211, 47, 47, 0.1)',
                              borderColor: 'rgba(211, 47, 47, 0.4)',
                              '&:hover': { 
                                bgcolor: 'rgba(211, 47, 47, 0.2)',
                                borderColor: 'error.main',
                                boxShadow: '0 4px 12px rgba(211, 47, 47, 0.3)'
                              },
                              opacity: user.email === currentUser?.email ? 0.3 : 1
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </Button>
                        </span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Custom Confirmation Popup */}
        <Dialog
          open={Boolean(userToDelete)}
          onClose={() => setUserToDelete(null)}
          TransitionComponent={ZoomTransition}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: isDark ? 'rgba(30, 30, 35, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(15px)',
              border: `1px solid ${glassBorder}`,
              borderRadius: 4,
              boxShadow: isDark ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : '0 20px 40px -10px rgba(0, 0, 0, 0.15)',
              p: 1
            }
          }}
        >
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Avatar 
              sx={{ 
                mx: 'auto', mb: 1.5, 
                width: 48, height: 48,
                bgcolor: `${theme.palette.error.main}22`,
                color: theme.palette.error.main,
                border: `1px solid ${theme.palette.error.main}44`
              }}
            >
              <DeleteIcon sx={{ fontSize: 24 }} />
            </Avatar>
            <Typography variant="h6" fontWeight="700" color={textColor} gutterBottom sx={{ fontSize: '1.1rem' }}>
              Confirm Deletion
            </Typography>
            <Typography variant="body2" color={secondaryTextColor} sx={{ mb: 3, fontSize: '0.85rem' }}>
              Are you sure you want to delete <strong>{userToDelete?.username || userToDelete?.email}</strong>?
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
              <Button 
                onClick={() => setUserToDelete(null)}
                variant="text"
                size="small"
                sx={{ color: secondaryTextColor, borderRadius: 2, px: 2 }}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (userToDelete) {
                    deleteUserMutation.mutate(userToDelete.id);
                    setUserToDelete(null);
                  }
                }}
                variant="contained"
                color="error"
                size="small"
                sx={{ 
                  borderRadius: 2, px: 3, fontWeight: 'bold',
                  boxShadow: '0 8px 20px rgba(211, 47, 47, 0.3)'
                }}
              >
                Delete
              </Button>
            </Box>
          </Box>
        </Dialog>
      </Box>
    </Fade>
  );
};

// Animation component for the dialog
const ZoomTransition = React.forwardRef(function Transition(
  props: any,
  ref: React.Ref<unknown>,
) {
  return <Zoom ref={ref} {...props} />;
});
