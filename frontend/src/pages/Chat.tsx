import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { apiAxios } from '../api/axiosConfig';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Alert, Menu, MenuItem, IconButton, ListItemIcon, ListItemText, Tooltip, Box } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DescriptionIcon from '@mui/icons-material/Description';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import DeleteIcon from '@mui/icons-material/Delete';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import jsPDF from 'jspdf';

interface Message {
  role: 'user' | 'bot';
  content: string;
  source?: string;
  symptom?: string;
  drug?: string;
  can_save?: boolean;
  structured?: string | any;
  created_at?: string;
  is_saved?: boolean;
}

interface Thread {
  id: string;
  title: string;
  created_at: string;
}

const Chat: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [savedKbIndices, setSavedKbIndices] = useState<Set<number>>(new Set());
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [kbRequestStatus, setKbRequestStatus] = useState<Record<number, { exists: boolean; status?: string }>>({});

  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'X-User-Email': user?.email || '',
      'X-User-Name': user?.name || '',
      'X-User-Role': user?.role || ''
    };
  };
  const [disclaimerOpen, setDisclaimerOpen] = useState(true);
  const [currentStructuredData, setCurrentStructuredData] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const [userAnchorEl, setUserAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteThreadId, setDeleteThreadId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch threads from Flask backend
  const fetchThreads = async () => {
    try {
      const email = user?.email || sessionStorage.getItem('userEmail') || '';
      const name = user?.name || sessionStorage.getItem('userName') || 'User';
      const role = user?.role || sessionStorage.getItem('userRole') || 'user';
      
      if (!email) return;
      
      const res = await fetch('/api/threads', { 
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-User-Email': email,
          'X-User-Name': name,
          'X-User-Role': role
        }
      });
      const data = await res.json();
      if (!res.ok) {
        setThreads([]);
        return;
      }
      setThreads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch threads:', err);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, []);

  // Also fetch when user logs in
  useEffect(() => {
    if (user) {
      fetchThreads();
    }
  }, [user]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages, loading]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-mode', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-mode', 'light');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const loadThreadMessages = async (threadId: string) => {
    const email = user?.email || sessionStorage.getItem('userEmail') || '';
    const name = user?.name || sessionStorage.getItem('userName') || 'User';
    const role = user?.role || sessionStorage.getItem('userRole') || 'user';
    
    setCurrentThreadId(threadId);
    setMessages([]);
    setSidebarOpen(false);
    try {
      const res = await fetch(`/api/threads/${threadId}`, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-User-Email': email,
          'X-User-Name': name,
          'X-User-Role': role
        }
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('Failed to fetch messages:', data?.error || res.statusText);
        setMessages([]);
        return;
      }
      const normalizedMessages = Array.isArray(data) ? data : (data?.messages ?? []);
      if (!Array.isArray(normalizedMessages)) {
        console.error('Unexpected messages payload:', data);
        setMessages([]);
        return;
      }
      setMessages(normalizedMessages);
    } catch (err) {
      console.error(err);
    }
  };

  const startNewChat = () => {
    setCurrentThreadId(null);
    setMessages([]);
    setSidebarOpen(false);
  };

  const deleteThread = async () => {
    if (!deleteThreadId) return;
    const email = user?.email || sessionStorage.getItem('userEmail') || '';
    const name = user?.name || sessionStorage.getItem('userName') || 'User';
    const role = user?.role || sessionStorage.getItem('userRole') || 'user';
    
    try {
      await fetch(`/api/threads/${deleteThreadId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-User-Email': email,
          'X-User-Name': name,
          'X-User-Role': role
        }
      });
      if (currentThreadId === deleteThreadId) {
        startNewChat();
      }
      await fetchThreads();
    } catch (err) {
      console.error('Failed to delete thread:', err);
    } finally {
      setDeleteDialogOpen(false);
      setDeleteThreadId(null);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage = inputValue;
    setInputValue('');
    setLoading(true);

    const newMsg: Message = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, newMsg]);

    const email = user?.email || sessionStorage.getItem('userEmail') || '';
    const name = user?.name || sessionStorage.getItem('userName') || 'User';
    const role = user?.role || sessionStorage.getItem('userRole') || 'user';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-User-Email': email,
          'X-User-Name': name,
          'X-User-Role': role
        },
        body: JSON.stringify({ message: userMessage, thread_id: currentThreadId })
      });

      const responseData = await res.json();

      if (responseData.error) {
        setMessages(prev => [...prev, { role: 'bot', content: responseData.error, source: 'error' }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'bot',
          content: responseData.response,
          source: responseData.source,
          symptom: responseData.symptom,
          drug: responseData.drug,
          can_save: responseData.can_save,
          structured: responseData.structured
        }]);

        if (!currentThreadId && responseData.thread_id) {
          setCurrentThreadId(responseData.thread_id);
          fetchThreads();
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { role: 'bot', content: 'Sorry, there was an error processing your request.', source: 'error' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const checkKbRequest = async (structuredData: any, index: number) => {
    // Check if we already have this info cached
    if (kbRequestStatus[index]) {
      return kbRequestStatus[index];
    }

    try {
      let rawData = structuredData.data || structuredData;
      let finalData;
      
      if (typeof rawData === 'string') {
        try {
          finalData = JSON.parse(rawData.replace(/'/g, '"'));
        } catch (e) {
          finalData = JSON.parse(rawData);
        }
      } else {
        finalData = rawData;
      }

      const symptom = (finalData.symptom || '').trim().toLowerCase();
      const drug = (finalData.drug || '').trim().toLowerCase();

      if (!symptom || !drug) {
        return { exists: false };
      }

      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/kb_request/check', {
        symptom,
        drug
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-User-Email': user?.email || '',
          'X-User-Name': user?.name || '',
          'X-User-Role': user?.role || ''
        }
      });

      // Cache the result
      setKbRequestStatus(prev => ({ ...prev, [index]: response.data }));
      
      return response.data;
    } catch (error) {
      console.error('Error checking KB request:', error);
      return { exists: false };
    }
  };

  const saveToKb = async (structuredData: any, index: number) => {
    // Check if already requested
    const status = await checkKbRequest(structuredData, index);
    
    if (status.exists) {
      // Already exists - update cache and show message
      setKbRequestStatus(prev => ({ ...prev, [index]: status }));
      return;
    }
    
    setCurrentStructuredData({ data: structuredData, index });
    setSaveDialogOpen(true);
  };

  const confirmSave = async () => {
    if (!currentStructuredData) return;

    try {
      // Extract data - handle different possible structures
      let rawData = currentStructuredData.data || currentStructuredData;
      let finalData;
      
      if (typeof rawData === 'string') {
        try {
          finalData = JSON.parse(rawData.replace(/'/g, '"'));
        } catch (e) {
          finalData = JSON.parse(rawData);
        }
      } else {
        finalData = rawData;
      }

      // Log for debugging
      console.log('Saving KB data:', finalData);

      let payload = {
        suggested_symptom: finalData.symptom || finalData.Symptom || '',
        suggested_drug: finalData.drug || finalData.Drug || '',
        suggested_mechanism: finalData.mechanism || finalData.Mechanism || '',
        suggested_precautions: finalData.precautions || finalData.Precautions || '',
        suggested_side_effects: finalData.side_effect || finalData.sideEffects || '',
      };

      // Only proceed if we have symptom and drug
      if (!payload.suggested_symptom || !payload.suggested_drug) {
        console.error('Missing symptom or drug:', payload);
        return;
      }

      // KB request goes to Flask (which syncs to NestJS)
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/kb_request', payload, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'X-User-Email': user?.email || '',
          'X-User-Name': user?.name || '',
          'X-User-Role': user?.role || ''
        }
      });
      
      // Show success animation
      setShowSaveSuccess(true);
      
      // Mark this message as saved
      const newSet = new Set<number>();
      savedKbIndices.forEach(v => newSet.add(v));
      newSet.add(currentStructuredData.index);
      setSavedKbIndices(newSet);
      
      // Update request status
      setKbRequestStatus(prev => ({ 
        ...prev, 
        [currentStructuredData.index]: { exists: true, status: 'pending' } 
      }));
      
      // Close dialog after animation
      setTimeout(() => {
        setShowSaveSuccess(false);
        setSaveDialogOpen(false);
        setCurrentStructuredData(null);
      }, 1200);
    } catch (error) {
      console.error('Error saving to KB:', error);
    }
  };

  const formatText = (text: string) => {
    let formatted = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/\n/g, '<br/>');
    return formatted;
  };

  const handleExportClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setExportAnchorEl(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportAnchorEl(null);
  };

  const handleCopy = (text: string, idx: number) => {
    // Remove HTML tags for cleaner copy
    const cleanText = text.replace(/<[^>]*>?/gm, '');
    navigator.clipboard.writeText(cleanText).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  };

  const exportChatTxt = () => {
    handleExportClose();
    if (messages.length === 0) return;
    const chatContent = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    const blob = new Blob([chatContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${currentThreadId || 'new'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportChatPdf = () => {
    handleExportClose();
    if (messages.length === 0) return;
    const doc = new jsPDF();
    let yPos = 10;
    messages.forEach((m) => {
      const textLines = doc.splitTextToSize(`${m.role.toUpperCase()}: ${m.content.replace(/<[^>]*>?/gm, '')}`, 180);
      doc.text(textLines, 10, yPos);
      yPos += (textLines.length * 7) + 5;
      if (yPos > 280) {
        doc.addPage();
        yPos = 10;
      }
    });
    doc.save(`chat-export-${currentThreadId || 'new'}.pdf`);
  };

  // Main UI
  return (
    <div className="bg-background text-foreground font-ui antialiased">
      <div className="app-container">

        {/* Sidebar Backdrop */}
        {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

        {/* Sidebar */}
        <aside className={`sidebar bg-sidebar ${sidebarOpen ? 'open' : ''}`} id="sidebar">
          <div className="sidebar-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <button id="newChatBtn" className="new-chat-btn" onClick={startNewChat} style={{ flex: 1 }}>
                <div className="new-chat-content">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  <span>New chat</span>
                </div>
              </button>
              <button className="sidebar-collapse-btn" onClick={() => setSidebarOpen(false)} title="Hide sidebar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline></svg>
              </button>
              <button className="sidebar-close-mobile" onClick={() => setSidebarOpen(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          </div>
          <div className="sidebar-nav">
            <div id="threadList" className="thread-list">
              <div className="thread-section" id="todayThreads">
                <h3 className="thread-heading">All Chats</h3>
                <div className="thread-items">
                  {threads.map(thread => (
                    <div key={thread.id} className={`thread-item ${currentThreadId === thread.id ? 'active' : ''}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span onClick={() => loadThreadMessages(thread.id)} style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {thread.title}
                      </span>
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteThreadId(thread.id);
                          setDeleteDialogOpen(true);
                        }}
                        sx={{ color: 'var(--muted-foreground)', '&:hover': { color: 'var(--danger-100)' } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="sidebar-footer">
            <div 
              className="user-profile" 
              onClick={(e) => setUserAnchorEl(e.currentTarget)}
            >
              <div className="avatar-small">{user?.name ? user.name[0].toUpperCase() : 'U'}</div>
              <span className="user-name">{user?.name || 'User'}</span>
            </div>
            
            <Menu
              anchorEl={userAnchorEl}
              open={Boolean(userAnchorEl)}
              onClose={() => setUserAnchorEl(null)}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              sx={{
                '& .MuiPaper-root': {
                  borderRadius: '12px',
                  minWidth: '200px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  mt: -1,
                  backgroundColor: 'var(--card)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)'
                }
              }}
            >
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{user?.name}</Typography>
                <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
              </div>


              {user?.role === 'admin' && (
                <MenuItem onClick={() => {
                  setUserAnchorEl(null);
                  navigate('/admin');
                }}>
                  <ListItemIcon>
                    <AdminPanelSettingsIcon fontSize="small" sx={{ color: 'var(--primary)' }} />
                  </ListItemIcon>
                  <ListItemText primary="🛡️ Admin Panel" />
                </MenuItem>
              )}

              <MenuItem onClick={() => {
                setUserAnchorEl(null);
                logout();
                navigate('/');
              }}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" sx={{ color: 'var(--danger-100)' }} />
                </ListItemIcon>
                <ListItemText primary="Logout" />
              </MenuItem>
            </Menu>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content" onClick={() => sidebarOpen && setSidebarOpen(false)}>
          {/* Header */}
          <header className="chat-header">
            <button className="sidebar-toggle" id="sidebarToggle" aria-label="Toggle sidebar" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <div className="header-actions">
              <Tooltip title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
                <IconButton
                  onClick={() => setDarkMode(!darkMode)}
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {darkMode ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              {messages.length > 0 && (
                <>
                  <IconButton
                    aria-label="more"
                    id="long-button"
                    aria-controls={exportAnchorEl ? 'long-menu' : undefined}
                    aria-expanded={exportAnchorEl ? 'true' : undefined}
                    aria-haspopup="true"
                    onClick={handleExportClick}
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                  <Menu
                    id="long-menu"
                    className="export-menu"
                    MenuListProps={{
                      'aria-labelledby': 'long-button',
                    }}
                    anchorEl={exportAnchorEl}
                    open={Boolean(exportAnchorEl)}
                    onClose={handleExportClose}
                    PaperProps={{
                      style: {
                        backgroundColor: 'var(--popover)',
                        color: 'var(--popover-foreground)',
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        minWidth: '200px',
                        padding: '6px',
                        border: '1px solid var(--border)'
                      }
                    }}
                  >
                    <MenuItem onClick={exportChatTxt} className="export-menu-item">
                      <ListItemIcon className="export-menu-icon">
                        <DescriptionIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Export as TXT" primaryTypographyProps={{ fontWeight: 500, fontSize: '0.9rem' }} />
                    </MenuItem>
                    <MenuItem onClick={exportChatPdf} className="export-menu-item">
                      <ListItemIcon className="export-menu-icon">
                        <PictureAsPdfIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Export as PDF" primaryTypographyProps={{ fontWeight: 500, fontSize: '0.9rem' }} />
                    </MenuItem>
                  </Menu>
                </>
              )}
            </div>
          </header>

          <Dialog
            open={deleteDialogOpen}
            onClose={() => setDeleteDialogOpen(false)}
            PaperProps={{ 
              sx: { 
                backgroundColor: 'var(--card)', 
                backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0))',
                color: 'var(--foreground)',
                borderRadius: '24px',
                border: '1px solid var(--border)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                padding: '12px',
                mx: 2,
                width: '100%',
                maxWidth: '240px'
              } 
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2, px: 2, pt: 2 }}>
              <Box sx={{ 
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1))', 
                borderRadius: '20px', 
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 16px rgba(239, 68, 68, 0.1)'
              }}>
                <WarningAmberIcon sx={{ color: '#ef4444', fontSize: 24 }} />
              </Box>
              <DialogTitle sx={{ p: 0, fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.03em', color: 'var(--foreground)' }}>Delete Chat?</DialogTitle>
            </Box>
            <DialogContent sx={{ mt: 1, px: 2, pb: 0 }}>
              <Typography variant="body2" sx={{ color: 'var(--muted-foreground)', lineHeight: 1.4, textAlign: 'center', fontWeight: 500, fontSize: '0.8rem' }}>
                This is permanent. You won't be able to recover this chat.
              </Typography>
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 3, gap: 1, flexDirection: 'column' }}>
              <Button 
                onClick={deleteThread} 
                variant="contained"
                fullWidth
                sx={{ 
                  borderRadius: '14px',
                  backgroundColor: '#ef4444',
                  textTransform: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  py: 1.2,
                  boxShadow: '0 8px 20px rgba(239, 68, 68, 0.3)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: '#dc2626',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 10px 25px rgba(239, 68, 68, 0.4)'
                  },
                  '&:active': {
                    transform: 'translateY(0)'
                  }
                }}
              >
                Delete Forever
              </Button>
              <Button 
                onClick={() => setDeleteDialogOpen(false)} 
                variant="text"
                fullWidth
                sx={{ 
                  borderRadius: '14px',
                  color: 'var(--muted-foreground)',
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1,
                  fontSize: '0.85rem',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--foreground)'
                  }
                }}
              >
                Go Back
              </Button>
            </DialogActions>
          </Dialog>

          <div className="chat-area" id="chatMessages">
            {messages.length === 0 ? (
              <div className="welcome-screen" id="welcomeScreen">
                <div className="welcome-avatar-wrapper">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="welcome-icon">
                    <path d="M12 2L12 22M2 12L22 12" strokeLinecap="round" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </div>
                <h1 className="welcome-title">Good afternoon</h1>
                <p className="welcome-subtitle">I'm MediChat, an AI assistant to help you understand your symptoms.</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`message-row ${msg.role}`}>
                  <div className={`message-inner ${msg.role}`}>
                    {msg.role === 'bot' ? (
                      <>
                        <div className="bot-avatar">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2L12 22M2 12L22 12" strokeLinecap="round" />
                            <circle cx="12" cy="12" r="10" />
                          </svg>
                        </div>
                        <div className="bot-content-wrapper">
                          <div className="bot-message-container">
                            <div className="message-bubble" dangerouslySetInnerHTML={{ __html: formatText(msg.content) }} />
                            <div className="message-actions">
                              <Tooltip title={copiedIdx === idx ? "Copied!" : "Copy to clipboard"} placement="top">
                                <IconButton
                                  size="small"
                                  onClick={() => handleCopy(msg.content, idx)}
                                  className="copy-btn"
                                  style={{ color: 'var(--muted-foreground)' }}
                                >
                                  {copiedIdx === idx ? <CheckIcon fontSize="inherit" style={{ color: 'var(--success-100)' }} /> : <ContentCopyIcon fontSize="inherit" />}
                                </IconButton>
                              </Tooltip>
                            </div>
                          </div>
                          {msg.source && msg.source !== 'error' && (
                            <div className="bot-extras" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              {msg.source === 'database' && (
                                <Tooltip title="Verified from Knowledge Base" placement="top">
                                  <div className="source-icon-badge verified">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>
                                  </div>
                                </Tooltip>
                              )}
                              {msg.source === 'llm_fallback' && (
                                <Tooltip title="AI Generated" placement="top">
                                  <div className="source-icon-badge ai-generated">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path></svg>
                                  </div>
                                </Tooltip>
                              )}
                              {msg.can_save && msg.structured && (
                                <Tooltip title={
                                  savedKbIndices.has(idx) ? "Already requested" :
                                  (kbRequestStatus[idx]?.exists ? 
                                    (kbRequestStatus[idx].status === 'approved' ? "Already approved" : 
                                     kbRequestStatus[idx].status === 'pending' ? "Request pending" : 
                                     "Already requested") : 
                                    "Save to Knowledge Base")
                                } placement="top">
                                  <span>
                                    <IconButton 
                                      onClick={() => saveToKb(msg.structured, idx)} 
                                      className="save-kb-icon-btn" 
                                      size="small"
                                      disabled={savedKbIndices.has(idx) || kbRequestStatus[idx]?.exists}
                                    >
                                      {savedKbIndices.has(idx) || kbRequestStatus[idx]?.exists ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>
                                      ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path><line x1="12" y1="7" x2="12" y2="13"></line><line x1="9" y1="10" x2="15" y2="10"></line></svg>
                                      )}
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              )}
                              {/* Removed explicit drug info card per user request */}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="user-content-wrapper">
                        <div className="message-bubble" dangerouslySetInnerHTML={{ __html: formatText(msg.content) }} />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="typing-indicator active" id="typingIndicator" style={{ paddingBottom: '2rem' }}>
                <span className="typing-dots"><span></span><span></span><span></span></span>
                <span className="typing-text">MediChat is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} style={{ height: 1 }} />
          </div>

          <div className="input-container">
            <div className="input-box bg-bg-200">
              <div className="input-inner">
                <textarea
                  id="messageInput"
                  placeholder="Message MediChat..."
                  rows={1}
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                  }}
                  onKeyDown={handleKeyPress}
                  aria-label="Message text"
                  disabled={loading}
                />
              </div>
              <div className="input-actions">
                <div className="action-right">
                  <button id="sendBtn" className="send-btn" disabled={!inputValue.trim() || loading} onClick={sendMessage}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                  </button>
                </div>
              </div>
            </div>
            <div className="input-disclaimer text-text-300">
              Medical information only. Not a substitute for professional medical advice.
            </div>
          </div>
        </main>
      </div>

      {/* Save Dialog */}
      <Dialog
        open={saveDialogOpen}
        onClose={() => { setSaveDialogOpen(false); setCurrentStructuredData(null); }}
        PaperProps={{
          sx: {
            backgroundColor: 'var(--card)',
            backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0))',
            color: 'var(--foreground)',
            borderRadius: '24px',
            border: '1px solid var(--border)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            padding: '12px',
            mx: 2,
            width: '100%',
            maxWidth: '350px'
          }
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2, px: 2, pt: 2 }}>
          <Box sx={{
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.2), rgba(79, 70, 229, 0.1))',
            borderRadius: '20px',
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(79, 70, 229, 0.1)'
          }}>
            <AutoFixHighIcon sx={{ color: 'var(--primary)', fontSize: 24 }} />
          </Box>
          <DialogTitle sx={{ p: 0, fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.03em', color: 'var(--foreground)' }}>
            Knowledge Hub
          </DialogTitle>
        </Box>
        <DialogContent sx={{ mt: 1, px: 2, pb: 0 }}>
          {showSaveSuccess ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              py: 4,
              gap: 2
            }}>
              <Box sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'scaleIn 0.3s ease-out'
              }}>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="32" 
                  height="32" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="#22c55e" 
                  strokeWidth="3" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  style={{ animation: 'drawCheck 0.5s ease-out forwards' }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </Box>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#22c55e' }}>
                Saved Successfully!
              </Typography>
              <style>{`
                @keyframes scaleIn {
                  from { transform: scale(0); opacity: 0; }
                  to { transform: scale(1); opacity: 1; }
                }
                @keyframes drawCheck {
                  from { stroke-dasharray: 30; stroke-dashoffset: 30; }
                  to { stroke-dasharray: 30; stroke-dashoffset: 0; }
                }
              `}</style>
            </Box>
          ) : (
            <>
              <Typography variant="body2" sx={{ color: 'var(--muted-foreground)', lineHeight: 1.4, textAlign: 'center', fontWeight: 500, fontSize: '0.85rem', mb: 2 }}>
                Enhance our clinical knowledge base by saving this medical insight for future analysis.
              </Typography>

              {currentStructuredData && (
                <Box sx={{
                  backgroundColor: 'rgba(0,0,0,0.02)',
                  borderRadius: '16px',
                  p: 2,
                  border: '1px solid var(--border)',
                  textAlign: 'left',
                  width: '100%'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CloudUploadIcon sx={{ fontSize: 16, color: 'var(--primary)' }} />
                    <Typography variant="caption" sx={{ color: 'var(--muted-foreground)', fontWeight: 600, letterSpacing: '0.05em' }}>
                      DATA PREVIEW
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {(() => {
                      try {
                        const rawData = currentStructuredData?.data || currentStructuredData;
                        const data = typeof rawData === 'string'
                          ? JSON.parse(rawData.replace(/'/g, '"'))
                          : rawData;
                        return (
                          <>
                            {data.symptom && (
                              <Box>
                                <Typography variant="caption" sx={{ color: 'var(--muted-foreground)', display: 'block', fontSize: '0.65rem' }}>SYMPTOM</Typography>
                                <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{data.symptom}</Typography>
                              </Box>
                            )}
                            {data.drug && (
                              <Box>
                                <Typography variant="caption" sx={{ color: 'var(--muted-foreground)', display: 'block', fontSize: '0.65rem' }}>SUGGESTED DRUG</Typography>
                                <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{data.drug}</Typography>
                              </Box>
                            )}
                          </>
                        );
                      } catch (e) {
                        return <Typography variant="caption" sx={{ color: 'var(--muted-foreground)' }}>Complex medical data identified</Typography>;
                      }
                    })()}
                  </Box>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 3, gap: 1, flexDirection: 'column' }}>
          <Button
            onClick={confirmSave}
            variant="contained"
            fullWidth
            sx={{
              borderRadius: '14px',
              backgroundColor: 'var(--primary)',
              textTransform: 'none',
              fontSize: '0.9rem',
              fontWeight: 700,
              py: 1.2,
              boxShadow: '0 8px 20px rgba(79, 70, 229, 0.2)',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'var(--ring)',
                transform: 'translateY(-1px)',
                boxShadow: '0 10px 25px rgba(79, 70, 229, 0.3)'
              },
              '&:active': {
                transform: 'translateY(0)'
              }
            }}
          >
            Confirm & Save to KB
          </Button>
          <Button
            onClick={() => setSaveDialogOpen(false)}
            variant="text"
            fullWidth
            sx={{
              borderRadius: '14px',
              color: 'var(--muted-foreground)',
              textTransform: 'none',
              fontWeight: 600,
              py: 1,
              fontSize: '0.85rem',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--foreground)'
              }
            }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Disclaimer Dialog */}
      <Dialog
        open={disclaimerOpen}
        disableEscapeKeyDown
        PaperProps={{
          style: {
            backgroundColor: 'var(--popover)',
            color: 'var(--popover-foreground)',
            borderRadius: '16px',
            padding: '8px',
            maxWidth: '450px'
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          color: 'var(--primary)',
          fontSize: '1.25rem',
          fontWeight: 600,
          pb: 1
        }}>
          <WarningAmberIcon />
          Medical Disclaimer
        </DialogTitle>
        <DialogContent sx={{ border: 'none', py: 1 }}>
          <Typography variant="body1" sx={{ color: 'var(--foreground)', opacity: 0.9, lineHeight: 1.6, mb: 2 }}>
            This application provides AI-powered health information for educational purposes.
            It is <strong>NOT</strong> a substitute for professional medical advice, diagnosis, or treatment.
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
            Never disregard professional medical advice or delay seeking it because of something you have read here.
            In an <strong>emergency</strong>, call your local emergency services immediately.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={() => setDisclaimerOpen(false)}
            variant="contained"
            fullWidth
            sx={{
              backgroundColor: 'var(--primary)',
              '&:hover': {
                backgroundColor: 'var(--ring)',
                opacity: 0.9
              },
              borderRadius: '10px',
              py: 1.2,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              boxShadow: 'none'
            }}
          >
            I Understand and Agree
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Chat;
