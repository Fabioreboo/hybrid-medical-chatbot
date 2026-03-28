import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Avatar,
  Menu,
  MenuItem,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  AccountCircle,
  Logout,
  Chat as ChatIcon,
  AdminPanelSettings as AdminIcon,
  Brightness4,
  Brightness7,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode } from '../contexts/ThemeContext';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    handleClose();
  };

  const navActive = (path: string) =>
    location.pathname === path ? { borderBottom: '2px solid white' } : {};

  return (
    <AppBar 
      position="static" 
      elevation={0}
      sx={{ 
        backgroundColor: darkMode ? '#0a0a0a' : '#ffffff', 
        borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
        px: 2,
        transition: 'all 0.3s ease'
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', minHeight: '64px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              fontWeight: 700, 
              color: darkMode ? 'white' : 'rgba(0,0,0,0.9)', 
              mr: 4, 
              letterSpacing: '-0.02em',
              cursor: 'pointer'
            }}
            onClick={() => navigate('/')}
          >
            MedChat
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', height: '64px' }}>
            <Button
              color="inherit"
              startIcon={<ChatIcon />}
              onClick={() => navigate('/chat')}
              sx={{
                height: '100%',
                borderRadius: 0,
                px: 3,
                fontSize: '0.85rem',
                fontWeight: 600,
                letterSpacing: '0.05em',
                color: location.pathname === '/chat' 
                  ? (darkMode ? 'white' : '#0ea5e9') 
                  : (darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'),
                borderBottom: location.pathname === '/chat' 
                  ? `2px solid ${darkMode ? 'white' : '#0ea5e9'}` 
                  : '2px solid transparent',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  color: darkMode ? 'white' : '#0ea5e9'
                }
              }}
            >
              CHAT
            </Button>

            {user?.role === 'admin' && (
              <Button
                color="inherit"
                startIcon={<AdminIcon />}
                onClick={() => navigate('/admin')}
                sx={{
                  height: '100%',
                  borderRadius: 0,
                  px: 3,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  color: location.pathname === '/admin' 
                    ? (darkMode ? 'white' : '#0ea5e9') 
                    : (darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'),
                  borderBottom: location.pathname === '/admin' 
                    ? `2px solid ${darkMode ? 'white' : '#0ea5e9'}` 
                    : '2px solid transparent',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    color: darkMode ? 'white' : '#0ea5e9'
                  }
                }}
              >
                ADMIN
              </Button>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Tooltip title={darkMode ? 'Light mode' : 'Dark mode'}>
            <IconButton 
              color="inherit" 
              onClick={toggleDarkMode}
              sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)', '&:hover': { color: darkMode ? 'white' : 'black' } }}
            >
              {darkMode ? <Brightness7 fontSize="small" /> : <Brightness4 fontSize="small" />}
            </IconButton>
          </Tooltip>

          <Box 
            onClick={handleMenu}
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5, 
              cursor: 'pointer',
              pl: 1,
              py: 0.5,
              borderRadius: '20px',
              transition: 'all 0.2s ease',
              '&:hover': { backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }
            }}
          >
            <Avatar
              src={user?.avatar_url}
              alt={user?.name}
              sx={{ 
                width: 32, 
                height: 32, 
                fontSize: '0.9rem',
                backgroundColor: 'rgba(56, 189, 248, 0.2)',
                color: '#0ea5e9',
                fontWeight: 700,
                border: '1px solid rgba(14, 165, 233, 0.3)'
              }}
            >
              {user?.name?.[0]?.toUpperCase()}
            </Avatar>
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 600, 
                color: darkMode ? 'white' : 'rgba(0,0,0,0.85)', 
                fontSize: '0.85rem',
                letterSpacing: '0.03em',
                textTransform: 'uppercase'
              }}
            >
              {user?.name || 'ADMIN'}
            </Typography>
          </Box>

          <Menu 
            anchorEl={anchorEl} 
            open={Boolean(anchorEl)} 
            onClose={handleClose}
            PaperProps={{
              sx: {
                mt: 1.5,
                backgroundColor: '#1a1a1a',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.1)',
                minWidth: '200px',
                borderRadius: '12px'
              }
            }}
          >
            <MenuItem disabled sx={{ opacity: '1 !important' }}>
              <Typography variant="body2" color="rgba(255,255,255,0.5)">
                {user?.email}
              </Typography>
            </MenuItem>
            <MenuItem onClick={handleLogout} sx={{ py: 1.5 }}>
              <Logout fontSize="small" sx={{ mr: 1, color: '#f87171' }} />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};