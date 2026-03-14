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
  IconButton,
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
} from '@mui/material';
import {
  History as HistoryIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

interface ChatMessage {
  id: string;
  message: string;
  response: string;
  source: 'database' | 'llm_fallback';
  created_at: string;
  is_saved: boolean;
}

interface PersonalKbEntry {
  id: string;
  symptom: string;
  drug: string;
  mechanism?: string;
  precautions?: string;
  side_effects?: string;
  created_at: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch chat history
  const { data: chatHistory } = useQuery(
    ['chatHistory', user?.id],
    () => axios.get('/chat/history').then(res => res.data),
    {
      enabled: !!user,
    }
  );

  // Fetch saved messages
  const { data: savedMessages } = useQuery(
    ['savedMessages', user?.id],
    () => axios.get('/chat/saved').then(res => res.data),
    {
      enabled: !!user,
    }
  );

  // Fetch personal KB
  const { data: personalKb } = useQuery(
    ['personalKb', user?.id],
    () => axios.get('/personal-kb').then(res => res.data),
    {
      enabled: !!user,
    }
  );

  const deleteMessage = async (messageId: string) => {
    await axios.delete(`/chat/${messageId}`);
    queryClient.invalidateQueries(['chatHistory']);
    setDeleteDialogOpen(false);
  };

  const exportChatHistory = () => {
    // Generate readable text content for export
    let textContent = `Chat History Export - ${format(new Date(), 'MMM dd, yyyy HH:mm')}\n\n`;
    
    if (chatHistory?.messages?.length > 0) {
      chatHistory.messages.forEach((msg: ChatMessage, index: number) => {
        textContent += `--- Chat #${chatHistory.messages.length - index} ---\n`;
        textContent += `Date: ${format(new Date(msg.created_at), 'MMM dd, yyyy HH:mm')}\n\n`;
        textContent += `Q: ${msg.message}\n\n`;
        textContent += `A: ${msg.response}\n\n`;
        textContent += `------------------------\n\n`;
      });
    } else {
      textContent += "No chat history found.";
    }

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-history-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = {
    totalChats: chatHistory?.total || 0,
    savedMessages: savedMessages?.length || 0,
    kbEntries: personalKb?.length || 0,
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Chats
              </Typography>
              <Typography variant="h5" component="h2">
                {stats.totalChats}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Saved Messages
              </Typography>
              <Typography variant="h5" component="h2">
                {stats.savedMessages}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                KB Entries
              </Typography>
              <Typography variant="h5" component="h2">
                {stats.kbEntries}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Chats */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Recent Chats
          </Typography>
          <Button startIcon={<DownloadIcon />} onClick={exportChatHistory} size="small">
            Export
          </Button>
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {chatHistory?.messages?.slice(0, 5).map((message: ChatMessage) => (
                <TableRow key={message.id}>
                  <TableCell>
                    {format(new Date(message.created_at), 'MMM dd, yyyy HH:mm')}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {message.message}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={message.source === 'database' ? 'Database' : 'AI'}
                      size="small"
                      color={message.source === 'database' ? 'success' : 'secondary'}
                    />
                  </TableCell>
                  <TableCell>
                    {message.is_saved ? (
                      <Chip label="Saved" color="primary" size="small" />
                    ) : (
                      <Chip label="Not Saved" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => setSelectedMessage(message)}
                    >
                      <HistoryIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Personal Knowledge Base */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Personal Knowledge Base
        </Typography>

        {personalKb?.length === 0 ? (
          <Typography color="text.secondary">
            No entries in your personal knowledge base yet.
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {personalKb?.map((entry: PersonalKbEntry) => (
              <Grid item xs={12} md={6} key={entry.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      {entry.symptom} - {entry.drug}
                    </Typography>
                    {entry.mechanism && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        <strong>Mechanism:</strong> {entry.mechanism}
                      </Typography>
                    )}
                    {entry.precautions && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        <strong>Precautions:</strong> {entry.precautions}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Created: {format(new Date(entry.created_at), 'MMM dd, yyyy')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Message Detail Dialog */}
      <Dialog
        open={!!selectedMessage}
        onClose={() => setSelectedMessage(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Chat Message Details</DialogTitle>
        <DialogContent>
          {selectedMessage && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Your Question:
              </Typography>
              <Typography paragraph>{selectedMessage.message}</Typography>

              <Typography variant="subtitle1" gutterBottom>
                Response:
              </Typography>
              <Typography paragraph>{selectedMessage.response}</Typography>

              <Typography variant="subtitle2" gutterBottom>
                Details:
              </Typography>
              <Typography variant="body2">
                <strong>Source:</strong> {selectedMessage.source === 'database' ? 'Database' : 'AI'}<br />
                <strong>Date:</strong> {format(new Date(selectedMessage.created_at), 'MMM dd, yyyy HH:mm')}<br />
                <strong>Saved:</strong> {selectedMessage.is_saved ? 'Yes' : 'No'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedMessage(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Message</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this message? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => deleteMessage(selectedMessage?.id || '')} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Dashboard;