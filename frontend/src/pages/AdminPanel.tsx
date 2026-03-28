import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Modal,
  TextField,
  Button,
  Fade,
  Backdrop,
} from '@mui/material';
import {
  Person as PersonIcon,
  CheckCircle as ApproveIcon,
  History as HistoryIcon,
  BarChart as AnalyticsIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { UserManagementTab } from '../components/admin/UserManagementTab';
import { KbApprovalTab } from '../components/admin/KbApprovalTab';
import { AuditLogsTab } from '../components/admin/AuditLogsTab';
import { AnalyticsTab } from '../components/AnalyticsTab';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const PinInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  error: boolean;
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
}> = ({ value, onChange, error, inputRefs }) => {
  const digits = value.split('');
  
  const handleChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    
    const newDigits = [...digits];
    newDigits[index] = val.slice(-1);
    const newValue = newDigits.join('');
    onChange(newValue);
    
    if (val && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter' && index === 3 && digits.every(d => d)) {
      (e.target as HTMLInputElement).form?.requestSubmit();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    onChange(pasted);
    if (pasted.length > 0) {
      inputRefs.current[Math.min(pasted.length, 3)]?.focus();
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', mb: 3 }} onPaste={handlePaste}>
      {[0, 1, 2, 3].map((index) => (
        <Box
          key={index}
          sx={{
            width: 56,
            height: 64,
            position: 'relative',
            borderRadius: 2,
            border: '2px solid',
            borderColor: error 
              ? '#ef4444' 
              : digits[index] 
                ? '#0ea5e9' 
                : 'var(--border)',
            backgroundColor: 'var(--card)',
            transition: 'all 0.2s ease',
            transform: digits[index] ? 'scale(1.02)' : 'scale(1)',
            boxShadow: digits[index] 
              ? '0 0 0 4px rgba(14, 165, 233, 0.15)' 
              : 'none',
            animation: error 
              ? 'shake 0.4s ease-in-out' 
              : digits[index] 
                ? 'pop 0.2s ease' 
                : 'none',
            '@keyframes shake': {
              '0%, 100%': { transform: 'translateX(0)' },
              '25%': { transform: 'translateX(-6px)' },
              '75%': { transform: 'translateX(6px)' },
            },
            '@keyframes pop': {
              '0%': { transform: 'scale(1)' },
              '50%': { transform: 'scale(1.08)' },
              '100%': { transform: 'scale(1.02)' },
            },
          }}
        >
          <input
            ref={(el) => { inputRefs.current[index] = el; }}
            type="password"
            maxLength={1}
            value={digits[index] || ''}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            inputMode="numeric"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              textAlign: 'center',
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'var(--foreground)',
              caretColor: '#0ea5e9',
              letterSpacing: '0.1em',
            }}
          />
        </Box>
      ))}
    </Box>
  );
};

const AdminPanel: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [pinVerified, setPinVerified] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const verified = sessionStorage.getItem('adminPinVerified');
    if (verified === 'true') {
      setPinVerified(true);
    } else {
      setPinModalOpen(true);
    }
  }, []);

  const handlePinSubmit = async () => {
    if (pin.length !== 4) {
      setPinError(true);
      return;
    }

    setLoading(true);
    setPinError(false);

    try {
      const token = localStorage.getItem('token');
      console.log('Sending PIN:', pin);
      const response = await axios.post(
        `${API_URL}/admin/verify-pin`,
        { pin },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Response:', response.data);
      if (response.data.success) {
        sessionStorage.setItem('adminPinVerified', 'true');
        setPinVerified(true);
        setPinModalOpen(false);
      } else {
        setPinError(true);
        setPin('');
        inputRefs.current[0]?.focus();
      }
    } catch (error: any) {
      console.log('Error:', error.response?.data || error.message);
      setPinError(true);
      setPin('');
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (value: string) => {
    setPin(value);
    setPinError(false);
  };

  const TabPanel = (props: { children?: React.ReactNode; index: number }) => {
    return (
      <div role="tabpanel" hidden={tab !== props.index}>
        {tab === props.index && <Box sx={{ pt: 3 }}>{props.children}</Box>}
      </div>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography 
        variant="h4" 
        sx={{ 
          fontWeight: 800, 
          letterSpacing: '-0.02em', 
          mb: 4,
          color: 'var(--foreground)'
        }}
      >
        Admin Panel
      </Typography>

      <Box sx={{ 
        mb: 4, 
        borderBottom: '1px solid var(--border)',
        position: 'relative'
      }}>
        <Tabs 
          value={tab} 
          onChange={(e, newValue) => setTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
              backgroundColor: '#0ea5e9',
              boxShadow: '0 -2px 10px rgba(14, 165, 233, 0.4)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }
          }}
        >
          {[
            { label: 'USER MANAGEMENT', icon: <PersonIcon /> },
            { label: 'KB APPROVAL', icon: <ApproveIcon /> },
            { label: 'AUDIT LOGS', icon: <HistoryIcon /> },
            { label: 'ANALYTICS', icon: <AnalyticsIcon /> }
          ].map((item, index) => (
            <Tab 
              key={index}
              label={item.label}
              icon={item.icon}
              iconPosition="start"
              sx={{
                minHeight: '48px',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
                letterSpacing: '0.05em',
                px: 3,
                mr: 1,
                borderRadius: '12px 12px 0 0',
                transition: 'all 0.2s',
                color: 'var(--muted-foreground)',
                '&.Mui-selected': {
                  color: '#0ea5e9',
                },
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  color: 'var(--foreground)'
                }
              }}
            />
          ))}
        </Tabs>
      </Box>

      {/* User Management Tab */}
      <TabPanel index={0}>
        <UserManagementTab />
      </TabPanel>

      {/* KB Approval Tab */}
      <TabPanel index={1}>
        <KbApprovalTab />
      </TabPanel>

      {/* Audit Logs Tab */}
      <TabPanel index={2}>
        <AuditLogsTab />
      </TabPanel>

      {/* Analytics Tab */}
      <TabPanel index={3}>
        <AnalyticsTab />
      </TabPanel>

      {/* PIN Verification Modal */}
      <Modal
        open={pinModalOpen}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{
          backdrop: {
            timeout: 500,
            sx: { backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(4px)' }
          }
        }}
      >
        <Fade in={pinModalOpen}>
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 380,
            bgcolor: 'var(--background)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            boxShadow: '0 25px 80px -12px rgba(0, 0, 0, 0.6)',
            p: 5,
            textAlign: 'center',
            animation: 'modalIn 0.3s ease-out',
            '@keyframes modalIn': {
              '0%': { opacity: 0, transform: 'translate(-50%, -50%) scale(0.9)' },
              '100%': { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
            },
          }}>
            <Box sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(14, 165, 233, 0.05))',
              border: '2px solid rgba(14, 165, 233, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
              animation: 'iconPulse 2s ease-in-out infinite',
              '@keyframes iconPulse': {
                '0%, 100%': { boxShadow: '0 0 0 0 rgba(14, 165, 233, 0.3)' },
                '50%': { boxShadow: '0 0 0 12px rgba(14, 165, 233, 0)' },
              },
            }}>
              <LockIcon sx={{ fontSize: 36, color: '#0ea5e9' }} />
            </Box>
            
            <Typography variant="h5" sx={{ 
              fontWeight: 800, 
              mb: 1,
              color: 'var(--foreground)',
              letterSpacing: '-0.02em',
            }}>
              Admin Access
            </Typography>
            
            <Typography variant="body2" sx={{ 
              color: 'var(--muted-foreground)', 
              mb: 4,
              fontSize: '0.9rem',
            }}>
              Enter your 4-digit PIN to continue
            </Typography>

            <PinInput
              value={pin}
              onChange={handlePinChange}
              error={pinError}
              inputRefs={inputRefs}
            />

            {pinError && (
              <Typography variant="caption" sx={{ 
                color: '#ef4444', 
                display: 'block',
                mb: 2,
                fontWeight: 500,
              }}>
                Incorrect PIN. Please try again.
              </Typography>
            )}

            <Button
              fullWidth
              onClick={handlePinSubmit}
              disabled={loading || pin.length !== 4}
              sx={{
                py: 1.8,
                borderRadius: 2.5,
                fontWeight: 700,
                fontSize: '1rem',
                letterSpacing: '0.02em',
                backgroundColor: '#0ea5e9',
                color: '#fff',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: '#0284c7',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 6px 20px rgba(14, 165, 233, 0.35)',
                },
                '&:disabled': {
                  backgroundColor: 'var(--border)',
                  color: 'var(--muted-foreground)',
                  transform: 'none',
                  boxShadow: 'none',
                },
              }}
            >
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ 
                    width: 18, 
                    height: 18, 
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    '@keyframes spin': {
                      '100%': { transform: 'rotate(360deg)' },
                    },
                  }} />
                  Verifying...
                </Box>
              ) : 'Verify PIN'}
            </Button>
          </Box>
        </Fade>
      </Modal>
    </Container>
  );
};

export default AdminPanel;