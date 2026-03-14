# Medical Chatbot Backend

## Phase 1 Implementation

This is the backend implementation for the medical chatbot system with user authentication and role-based access control.

## Features Implemented

### Core Foundation (✅ Completed)
- **Database Schema**: PostgreSQL with user management, chat messages, personal KB, system KB, and audit logs
- **Google OAuth Authentication**: Complete authentication flow with JWT tokens
- **User Management**: CRUD operations for users with role-based access
- **RBAC Middleware**: Role-based access control for admin endpoints
- **Audit Logging**: Comprehensive logging of all user actions

### Database Tables
- `users`: User profiles with Google OAuth integration
- `chat_messages`: Chat conversation history
- `personal_kb`: User-specific saved knowledge entries
- `knowledge_base`: System-wide knowledge base with approval workflow
- `audit_logs`: Complete audit trail of all actions

### Authentication
- Google OAuth 2.0 integration
- JWT token-based authentication
- Role-based access (user/admin)

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis (optional, for caching)

### Installation

1. Clone the repository:
```bash
cd backend
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

4. Set up PostgreSQL database:
```bash
# Create database
createdb medical_chatbot

# Run migrations (if using TypeORM migrations)
npm run typeorm migration:run
```

5. Start the server:
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

### Environment Variables

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=medical_chatbot
DB_SYNCHRONIZE=false
DB_LOGGING=true

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Server Configuration
PORT=3001
NODE_ENV=development
```

## API Endpoints

### Authentication
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - Google OAuth callback
- `GET /auth/me` - Get current user profile

### Chat
- `POST /chat` - Send a chat message
- `GET /chat/history` - Get user chat history
- `POST /chat/:id/save` - Save a chat message to personal KB
- `GET /chat/saved` - Get saved chat messages

### Admin (Admin only)
- `GET /admin/users` - Get all users
- `POST /admin/users/:userId/admin` - Make user admin
- `POST /admin/users/:userId/deactivate` - Deactivate user
- `POST /admin/users/:userId/activate` - Activate user
- `GET /admin/kb/pending` - Get pending KB entries
- `POST /admin/kb/:entryId/approve` - Approve KB entry
- `POST /admin/kb/:entryId/reject` - Reject KB entry
- `GET /admin/kb/system` - Get approved KB entries
- `GET /admin/audit/logs` - Get audit logs
- `GET /admin/stats` - Get system statistics

## Next Steps

Phase 1 is complete. The next phase will implement:
1. React frontend with chat interface
2. Chat history storage and retrieval
3. Save to personal KB functionality
4. Basic user dashboard

## Testing

```bash
# Run tests
npm test

# Run test coverage
npm run test:cov
```

## Architecture

The backend follows NestJS best practices with:
- Modular architecture
- Dependency injection
- TypeORM for database operations
- JWT for authentication
- Comprehensive audit logging
- Role-based access control