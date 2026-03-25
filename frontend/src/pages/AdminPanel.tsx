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