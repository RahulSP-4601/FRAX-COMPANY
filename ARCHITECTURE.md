# FRAX Company Portal - Architecture

## Overview

The FRAX system is now split into TWO separate applications:

### 1. **FRAX Company Portal** (This Project - Port 3001)
- **Purpose**: Employee management and trial invite system
- **Users**: Founder and Sales Team only
- **Database**: `frax_company` database
- **URL**: http://localhost:3001 (dev) / company.frax.com (prod)

### 2. **FRAX** (Main Application - Port 3000)
- **Purpose**: Client-facing AI analytics platform
- **Users**: Clients/Customers only
- **Database**: `frax` database
- **URL**: http://localhost:3000 (dev) / frax.com (prod)

## Data Flow: Trial Invitation System

```
┌─────────────────────────────────────────────────────────────────┐
│ FRAX COMPANY PORTAL (Port 3001)                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Founder/Sales logs in to company portal                    │
│  2. Views waitlist entries                                     │
│  3. Clicks "Send Trial" button                                 │
│  4. System generates unique token                              │
│  5. Creates TrialInvite record                                 │
│  6. (TODO) Sends email with link:                              │
│      https://frax.com/trial/{token}                            │
│                                                                 │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ Token sent via email
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ CLIENT EMAIL                                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  "Click here to start your free trial:                         │
│   https://frax.com/trial/abc123..."                            │
│                                                                 │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ Client clicks link
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ FRAX MAIN APP (Port 3000)                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  7. /trial/{token} page loads                                  │
│  8. Validates token by calling Company Portal API:            │
│      POST company.frax.com/api/trial/validate                  │
│  9. If valid, shows signup form                                │
│  10. Client fills: name, email, password                       │
│  11. FRAX creates User account                                 │
│  12. Creates Subscription (status: TRIAL, 30 days)             │
│  13. Notifies Company Portal: token claimed                    │
│  14. Client redirected to /chat                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schemas

### FRAX Company Database

```sql
Employee
  - id, name, email, passwordHash
  - role (FOUNDER | SALES_MEMBER)
  - isApproved, refCode, commissionRate

WaitlistEntry
  - id, companyName, email, phone
  - status (PENDING | TRIAL_SENT | CONVERTED | DECLINED)
  - trialToken, trialSentAt
  - invitedByEmployeeId

TrialInvite
  - id, employeeId, token, email, name
  - status (PENDING | CLAIMED | EXPIRED)
  - expiresAt, claimedAt, claimedBy (User ID from FRAX)
```

### FRAX Main Database

```sql
User (CLIENT ONLY)
  - id, name, email, passwordHash
  - NO role field
  - subscription relation

Subscription
  - userId, status (TRIAL | ACTIVE | ...)
  - currentPeriodStart, currentPeriodEnd
```

## API Endpoints

### FRAX Company Portal

#### Authentication
- `POST /api/auth/signin` - Employee login
- `POST /api/auth/signout` - Employee logout

#### Founder Dashboard
- `GET /api/founder/waitlist` - List waitlist entries
- `GET /api/founder/trials` - List trial invites
- `POST /api/founder/send-trial` - Send trial invite
  ```json
  { "email": "client@example.com", "name": "Client Name" }
  ```

#### Trial Validation (Called by FRAX Main App)
- `POST /api/trial/validate` - Validate trial token
  ```json
  Request: { "token": "abc123...", "secret": "shared-secret" }
  Response: { "valid": true, "email": "...", "name": "..." }
  ```

- `POST /api/trial/claim` - Mark trial as claimed
  ```json
  Request: { "token": "abc123...", "userId": "user_id", "secret": "..." }
  Response: { "success": true }
  ```

### FRAX Main App

#### Trial Signup (NEW)
- `GET /trial/[token]` - Trial signup page
- `POST /api/trial/signup` - Complete trial signup
  ```json
  Request: {
    "token": "abc123...",
    "name": "Client Name",
    "email": "client@example.com",
    "password": "..."
  }
  Response: {
    "success": true,
    "redirect": "/chat"
  }
  ```

## Environment Variables

### FRAX Company (.env)
```bash
DATABASE_URL="postgresql://...frax_company"
JWT_SIGNING_SECRET="..."
FRAX_API_URL="http://localhost:3000"  # Main FRAX app
FRAX_API_SECRET="shared-secret-123"   # Shared between apps
NEXT_PUBLIC_APP_URL="http://localhost:3001"
```

### FRAX Main (.env)
```bash
DATABASE_URL="postgresql://...frax"
JWT_SIGNING_SECRET="..."
FRAX_COMPANY_API_URL="http://localhost:3001"  # Company portal
FRAX_COMPANY_API_SECRET="shared-secret-123"   # Same as above
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Setup Instructions

### 1. FRAX Company Portal

```bash
cd frax_company
npm install
cp .env.example .env
# Edit .env with your values
npx prisma migrate dev --name init
npm run create-founder
npm run dev  # Runs on port 3001
```

### 2. FRAX Main App

```bash
cd FRAX
# Update .env with FRAX_COMPANY_API_URL and SECRET
# Remove Employee table from schema (migrate)
npm run dev  # Runs on port 3000
```

## What's Next (TODO)

1. **Create trial validation API in FRAX Company** ✅ (partially done)
2. **Create /trial/[token] page in FRAX**
3. **Create trial signup API in FRAX**
4. **Remove Employee table from FRAX schema**
5. **Remove role-based auth from FRAX signin**
6. **Add email sending to trial invite**
7. **Test end-to-end flow**

## Security Considerations

- **Shared Secret**: Both apps must have matching `FRAX_COMPANY_API_SECRET`
- **Token Expiration**: Trials expire after 7 days
- **One-time Use**: Tokens can only be claimed once
- **Validation**: Always validate token with Company Portal before creating account
- **No PII in URLs**: Token is random, doesn't contain email/name
