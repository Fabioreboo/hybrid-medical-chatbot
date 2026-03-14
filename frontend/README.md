# Medical Chatbot Frontend

## Phase 2 Implementation

This is the React frontend for the medical chatbot system with user authentication, chat interface, and admin panel.

## Features Implemented

### ✅ Completed
1. **Authentication System**
   - Google OAuth integration
   - JWT token management
   - Protected routes

2. **Chat Interface**
   - Real-time chat UI
   - Message history
   - Save to personal KB functionality
   - Export chat history

3. **User Dashboard**
   - Statistics overview
   - Recent chats table
   - Personal knowledge base display
   - Export functionality

4. **Admin Panel**
   - User management
   - KB approval workflow
   - Audit logs viewing
   - System statistics

### 🚧 Implementation Notes

The frontend uses:
- React 18 with TypeScript
- Material-UI for components
- React Query for data fetching
- React Router for navigation

## Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development server:
```bash
npm start
```

The app will open at `http://localhost:3000`

### Environment Variables

```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id_here
REACT_APP_GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
```

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── Header.tsx
│   └── LoadingSpinner.tsx
├── contexts/           # React contexts
│   └── AuthContext.tsx
├── pages/              # Page components
│   ├── Login.tsx
│   ├── Chat.tsx
│   ├── Dashboard.tsx
│   └── AdminPanel.tsx
├── App.tsx
├── index.tsx
└── ...
```

## API Integration

The frontend communicates with the backend API at:
- Base URL: `REACT_APP_API_URL`
- Endpoints:
  - `/auth/*` - Authentication
  - `/chat/*` - Chat functionality
  - `/kb/*` - Knowledge base
  - `/admin/*` - Admin features

## Next Steps

Phase 2 is now complete. The next phase (Phase 3) will focus on:
1. **Advanced Admin Features**
   - Enhanced analytics dashboard
   - User activity tracking
   - System configuration

2. **UI/UX Improvements**
   - Dark mode support
   - Responsive design optimizations
   - Accessibility improvements

3. **Performance Optimizations**
   - Message caching
   - Lazy loading
   - Image optimization

## Usage

1. **Login**: Click "Sign in with Google" to authenticate
2. **Chat**: Use the chat interface to ask medical questions
3. **Dashboard**: View your chat history and saved entries
4. **Admin**: Access admin panel (admin users only) to manage users and approve KB entries

## Testing

```bash
# Run tests
npm test

# Build for production
npm run build
```

## Deployment

The build output will be in the `build/` directory. You can deploy this to any static hosting service like:
- Netlify
- Vercel
- AWS S3
- GitHub Pages