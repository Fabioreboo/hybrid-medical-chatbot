import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import {
  People as PeopleIcon,
  Chat as ChatIcon,
  MenuBook as KbIcon,
  HourglassEmpty as PendingIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useQuery } from 'react-query';
import axios from 'axios';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalChats: number;
  totalKbEntries: number;
  pendingApprovals: number;
  chatsByDay: { date: string; count: number }[];
  topSymptoms: { symptom: string; count: number }[];
}

const PIE_COLORS = ['#1976d2', '#dc004e', '#2e7d32', '#ed6c02', '#9c27b0'];

const StatCard: React.FC<{
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}> = ({ label, value, icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography color="text.secondary" variant="body2" gutterBottom>
            {label}
          </Typography>
          <Typography variant="h4" fontWeight="bold">
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            bgcolor: color,
            borderRadius: 2,
            p: 1,
            display: 'flex',
            color: 'white',
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export const AnalyticsTab: React.FC = () => {
  const { data: stats, isLoading } = useQuery<SystemStats>(
    'systemStats',
    () => axios.get('/admin/stats').then(res => res.data),
    { refetchInterval: 30000 },
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }

  const userPieData = [
    { name: 'Active', value: stats?.activeUsers ?? 0 },
    { name: 'Inactive', value: (stats?.totalUsers ?? 0) - (stats?.activeUsers ?? 0) },
  ];

  return (
    <Box>
      {/* Stat Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={6} md={3}>
          <StatCard
            label="Total Users"
            value={stats?.totalUsers ?? 0}
            icon={<PeopleIcon />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            label="Total Chats"
            value={stats?.totalChats ?? 0}
            icon={<ChatIcon />}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            label="KB Entries"
            value={stats?.totalKbEntries ?? 0}
            icon={<KbIcon />}
            color="#9c27b0"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            label="Pending Approvals"
            value={stats?.pendingApprovals ?? 0}
            icon={<PendingIcon />}
            color="#ed6c02"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Chat activity chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Chat Activity — Last 7 Days
            </Typography>
            {stats?.chatsByDay?.length ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.chatsByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1976d2" radius={[4, 4, 0, 0]} name="Messages" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                No chat data available yet.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* User active/inactive pie */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              User Status
            </Typography>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={userPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {userPieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Top symptoms */}
        {stats?.topSymptoms?.length ? (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Top Symptoms in Knowledge Base
              </Typography>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.topSymptoms} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="symptom" type="category" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#9c27b0" radius={[0, 4, 4, 0]} name="Entries" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        ) : null}
      </Grid>
    </Box>
  );
};