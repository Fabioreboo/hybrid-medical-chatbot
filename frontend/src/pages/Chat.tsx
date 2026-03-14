import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  IconButton,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  Send,
  Save as SaveIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  message: string;
  response: string;
  source: 'database' | 'llm_fallback';
  created_at: string;
  user_id: string;
  is_saved: boolean;
  can_save?: boolean;
  structured?: {
    symptom: string;
    drug: string;
    mechanism?: string;
    precautions?: string;
    side_effects?: string;
  };
}

const Chat: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(true);
  const [currentMessage, setCurrentMessage] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch chat history
  const { data: chatHistory, isLoading: historyLoading } = useQuery(
    ['chatHistory', user?.id],
    async () => {
      const response = await axios.get('/chat/history');
      return response.data.messages as Message[];
    },
    {
      enabled: !!user,
      onSuccess: (data) => {
        setMessages([...data].reverse());
      },
    }
  );

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage = inputValue;
    setInputValue('');
    setLoading(true);

    // Add user message to UI immediately
    const newMessage: Message = {
      id: Date.now().toString(),
      message: userMessage,
      response: '',
      source: 'llm_fallback',
      created_at: new Date().toISOString(),
      user_id: user?.id || '',
      is_saved: false,
    };

    setMessages(prev => [...prev, newMessage]);

    try {
      // 1. Call the Python LLM Backend to get the response
      const llmResponse = await axios.post('http://localhost:5000/chat', {
        message: userMessage,
      });

      const responseData = llmResponse.data;

      const chatResponse = {
        id: Date.now().toString(),
        response: responseData.response || responseData.answer || 'No response received from the medical assistant.',
        source: responseData.source || 'llm_fallback',
        can_save: true,
        structured: responseData.structured || {},
      };

      // Update the message with response
      setMessages(prev =>
        prev.map(msg =>
          msg.id === newMessage.id
            ? { ...msg, ...chatResponse }
            : msg
        )
      );

      // 2. Save the chat history to the NestJS Backend
      await axios.post('/chat', {
        message: userMessage,
        response: chatResponse.response,
        source: chatResponse.source,
        session_id: 'session-' + Date.now(),
      });

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === newMessage.id
            ? { ...msg, response: 'Sorry, there was an error processing your request.' }
            : msg
        )
      );
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

  const saveToKb = (message: Message) => {
    setCurrentMessage(message);
    setSaveDialogOpen(true);
  };

  const confirmSave = async () => {
    if (!currentMessage) return;

    try {
      // 1. Save to Personal KB (NestJS)
      await axios.post(`/chat/${currentMessage.id}/save`);
      
      // 2. Also save to Global KB (Python LLM Backend) if it has structured data
      if (currentMessage.structured) {
          try {
              await axios.post('http://localhost:5000/save-kb', currentMessage.structured);
          } catch (e) {
              console.warn('Failed to save to global KB (Python backend)', e);
          }
      }
      setMessages(prev =>
        prev.map(msg =>
          msg.id === currentMessage.id
            ? { ...msg, is_saved: true }
            : msg
        )
      );
      queryClient.invalidateQueries(['chatHistory']);
      setSaveDialogOpen(false);
    } catch (error) {
      console.error('Error saving to KB:', error);
    }
  };

  const clearChat = () => {
    setMessages([]);
    queryClient.invalidateQueries(['chatHistory']);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '80vh' }}>
        {/* Header */}
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' }, fontWeight: 'bold' }}>
            Medical Assistant
          </Typography>
          <Box sx={{ display: 'flex', flexShrink: 0 }}>
            <IconButton onClick={clearChat} color="inherit">
              <DeleteIcon />
            </IconButton>
            <IconButton onClick={() => navigate('/dashboard')} color="inherit">
              <HistoryIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Messages */}
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: 2,
            mb: 2,
            backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f5f5f5',
          }}
        >
          {messages.length === 0 && !historyLoading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                Start a conversation with your medical assistant
              </Typography>
            </Box>
          ) : (
            messages.map((message) => (
              <Box key={message.id} sx={{ mb: 3 }}>
                {/* User message */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                  <Paper sx={{ p: 2, backgroundColor: 'primary.main', color: 'primary.contrastText', maxWidth: { xs: '90%', sm: '70%' } }}>
                    <Typography variant="body1">{message.message}</Typography>
                  </Paper>
                </Box>

                {/* Bot response */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <Paper sx={{ p: 2, maxWidth: { xs: '90%', sm: '70%' } }}>
                    <Typography variant="body1" paragraph>
                      {message.response}
                    </Typography>

                    {message.source === 'llm_fallback' && (
                      <Box sx={{ mt: 2 }}>
                        <Chip
                          label="AI Response"
                          size="small"
                          color="secondary"
                        />
                        {message.can_save && (
                          <Button
                            size="small"
                            startIcon={<SaveIcon />}
                            onClick={() => saveToKb(message)}
                            sx={{ ml: 1 }}
                          >
                            Save to KB
                          </Button>
                        )}
                      </Box>
                    )}
                  </Paper>
                </Box>
              </Box>
            ))
          )}

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress />
            </Box>
          )}

          <div ref={messagesEndRef} />
        </Paper>

        {/* Input */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask..."
            disabled={loading}
            sx={{ backgroundColor: (theme) => theme.palette.background.paper }}
          />
          <Button
            variant="contained"
            onClick={sendMessage}
            disabled={!inputValue.trim() || loading}
            sx={{ minWidth: { xs: '60px', sm: '100px' }, px: { xs: 1, sm: 3 } }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, mr: 1 }}>
              Send
            </Box>
            <Send />
          </Button>
        </Box>

        {/* Save Dialog */}
        <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
          <DialogTitle>Save to Knowledge Base</DialogTitle>
          <DialogContent>
            <Alert severity="info">
              This will save the medical information to your personal knowledge base
              for future reference.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmSave} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>

        {/* Disclaimer Dialog */}
        <Dialog open={disclaimerOpen} disableEscapeKeyDown>
          <DialogTitle sx={{ color: 'warning.main' }}>
            ⚠️ Medical Disclaimer
          </DialogTitle>
          <DialogContent dividers>
            <Typography variant="body1" paragraph>
              This application provides general health information and is powered by an AI. 
              It is <strong>NOT</strong> a substitute for professional medical advice, diagnosis, or treatment.
            </Typography>
            <Typography variant="body1">
              Always consult a qualified healthcare provider with any questions you may have regarding a medical condition.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDisclaimerOpen(false)} variant="contained" color="warning" fullWidth>
              I Understand and Agree
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default Chat;