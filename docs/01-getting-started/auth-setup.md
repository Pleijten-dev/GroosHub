# Authentication Setup Guide

## Required Environment Variables

Add these to your `.env.local` for local development and to your Vercel project settings for production:

### 1. Database Connection
```bash
POSTGRES_URL=your_postgresql_connection_string
```
Example: `postgresql://user:password@host:5432/database?sslmode=require`

### 2. NextAuth Configuration
```bash
# Generate a random secret using: openssl rand -base64 32
NEXTAUTH_SECRET=your_nextauth_secret_here

# CRITICAL: Set this to your actual deployment URL in production
# Local development:
NEXTAUTH_URL=http://localhost:3000

# Production (Vercel):
NEXTAUTH_URL=https://your-app.vercel.app
```

## Vercel Deployment Setup

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add the following variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `POSTGRES_URL` | Your PostgreSQL connection string | Production, Preview, Development |
| `NEXTAUTH_SECRET` | Your generated secret | Production, Preview, Development |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Production |
| `NEXTAUTH_URL` | `https://your-app-git-*.vercel.app` | Preview (use your preview URL pattern) |

4. **Important**: After adding environment variables, redeploy your application

## Database Setup

Your PostgreSQL database should have a `users` table:

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,  -- bcrypt hashed
    role VARCHAR(50) DEFAULT 'user',  -- 'user' or 'admin'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

## Creating Your First Admin User

You can create a test admin user with bcrypt-hashed password:

```sql
-- Password: "admin123" (bcrypt hashed)
INSERT INTO users (name, email, password, role)
VALUES (
    'Admin User',
    'admin@example.com',
    '$2a$10$rZ7YvZ8vZ8vZ8vZ8vZ8vZ8uZ8vZ8vZ8vZ8vZ8vZ8vZ8vZ8vZ8vZ8u',
    'admin'
);
```

**Note**: Replace with your own password hash generated using bcrypt with 10 rounds.

## Testing Authentication

1. Start your development server: `npm run dev`
2. Navigate to `http://localhost:3000`
3. You should be redirected to `/nl/login`
4. Log in with your admin credentials
5. Upon successful login, you'll be redirected to the home page

## Troubleshooting

### "OPTIONS 400 Bad Request" Error
- Ensure `NEXTAUTH_URL` is set correctly
- Check that your Vercel deployment URL matches the `NEXTAUTH_URL` value
- Verify environment variables are set in Vercel dashboard

### Page Reloads Without Logging In
- Check browser console for errors
- Verify `NEXTAUTH_SECRET` is set
- Ensure database connection is working
- Check server logs in Vercel for authentication errors

### "Access Denied" or Redirect Loop
- Clear browser cookies for the site
- Verify user exists in database
- Check user's `role` field is set correctly

### Cannot Access Admin Panel
- Ensure your user has `role='admin'` in the database
- Check that you're logged in as an admin user

## Admin Features

Once logged in as an admin:
- Access the admin panel at `/nl/admin` or `/en/admin`
- Create new users
- Edit user details (name, email, password, role)
- Delete users (except yourself)
- Change user roles between 'user' and 'admin'
