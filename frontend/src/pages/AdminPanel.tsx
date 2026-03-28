import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Person as PersonIcon,
  CheckCircle as ApproveIcon,
  History as HistoryIcon,
  BarChart as AnalyticsIcon,
} from '@mui/icons-material';
import { UserManagementTab } from '../components/admin/UserManagementTab';
import { KbApprovalTab } from '../components/admin/KbApprovalTab';
import { AuditLogsTab } from '../components/admin/AuditLogsTab';
import { AnalyticsTab } from '../components/AnalyticsTab';

const AdminPanel: React.FC = () => {
  const [tab, setTab] = useState(0);

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
    </Container>
  );
};

export default AdminPanel;