# Read-Only Viewer Account Setup

This document provides instructions for creating a read-only viewer account for LLM (ChatGPT) review of the application architecture.

## Overview

The application now has a **role-based access control system** with three roles:
- `admin`: Full access to view and edit
- `viewer`: Read-only access to view all data and architecture
- `user`: Regular user access

## Step 1: Create the Viewer Account

### Option A: Via the Application UI
1. Go to your application's authentication page
2. Sign up with the viewer email:
   - **Email**: `viewer@llmreview.local` (or any email you prefer)
   - **Password**: Create a secure password
   - **Name**: `LLM Reviewer` (optional)

### Option B: Via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **Users**
3. Click **Add user** > **Create new user**
4. Fill in:
   - **Email**: `viewer@llmreview.local`
   - **Password**: Create a secure password
   - **Auto Confirm User**: ✓ (checked)

## Step 2: Assign the Viewer Role

After creating the user account, you need to assign the viewer role:

### Via Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query and run this SQL (replace the email if you used a different one):

```sql
-- Find the user_id for the viewer account
SELECT id, email FROM auth.users WHERE email = 'viewer@llmreview.local';

-- Assign the viewer role (replace USER_ID_HERE with the actual UUID from above)
INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_ID_HERE', 'viewer');
```

**Alternative one-step query:**
```sql
-- This will automatically assign the viewer role to the email
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'viewer'::app_role
FROM auth.users
WHERE email = 'viewer@llmreview.local'
ON CONFLICT (user_id, role) DO NOTHING;
```

## Step 3: Verify Setup

1. Log in with the viewer account credentials
2. Navigate to `/admin` route
3. You should see a blue "Read-Only Mode" badge next to the "Admin Panel" title
4. All edit buttons, save buttons, and action buttons should be hidden or disabled
5. You can view all:
   - Companions and their configurations
   - Client data and subscriptions
   - Usage analytics and cost data
   - Payment history
   - Support tickets
   - Database structure and RLS policies

## Login Credentials to Share

After setup, provide these credentials to ChatGPT or other LLMs:

```
Application URL: [YOUR_APP_URL]
Login Page: [YOUR_APP_URL]/auth (or wherever your login is)

Viewer Account Credentials:
Email: viewer@llmreview.local
Password: [YOUR_SECURE_PASSWORD]

Admin Panel URL: [YOUR_APP_URL]/admin
```

## What the Viewer Can Access

The viewer account has read-only SELECT access to all tables:
- ✅ View all companions
- ✅ View all user profiles and subscriptions
- ✅ View usage analytics and cost data
- ✅ View payment history
- ✅ View support tickets
- ✅ View referrals and credits
- ✅ View database schema and RLS policies
- ❌ Cannot create, update, or delete any data
- ❌ Cannot generate images
- ❌ Cannot invite testers
- ❌ Cannot modify subscriptions

## Security Considerations

- The viewer account can see **all user data**, including emails and usage patterns
- The viewer account **cannot see passwords** or payment card details (these are encrypted/tokenized)
- The viewer account **cannot make any changes** to the database
- The viewer account **cannot access Stripe dashboard** or other external services
- Consider using a temporary password and rotating it after the review

## Revoking Access

To remove viewer access, simply delete the role assignment:

```sql
DELETE FROM public.user_roles
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'viewer@llmreview.local'
);
```

Or delete the entire user account from **Authentication** > **Users** in the Supabase dashboard.
