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
  Dashboard as DashboardIcon,
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
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 0, mr: 3 }}>
          MedChat
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
          <Button
            color="inherit"
            startIcon={<ChatIcon />}
            onClick={() => navigate('/chat')}
            sx={navActive('/chat')}
          >
            Chat
          </Button>

          <Button
            color="inherit"
            startIcon={<DashboardIcon />}
            onClick={() => navigate('/dashboard')}
            sx={navActive('/dashboard')}
          >
            Dashboard
          </Button>

          {user?.role === 'admin' && (
            <Button
              color="inherit"
              startIcon={<AdminIcon />}
              onClick={() => navigate('/admin')}
              sx={navActive('/admin')}
            >
              Admin
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={darkMode ? 'Light mode' : 'Dark mode'}>
            <IconButton color="inherit" onClick={toggleDarkMode}>
              {darkMode ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Tooltip>

          <Button
            color="inherit"
            onClick={handleMenu}
            startIcon={
              <Avatar
                src={user?.avatar_url}
                alt={user?.name}
                sx={{ width: 28, height: 28, fontSize: '0.9rem' }}
              >
                {user?.name?.[0]?.toUpperCase()}
              </Avatar>
            }
          >
            {user?.name?.split(' ')[0]}
          </Button>

          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <Logout fontSize="small" sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};