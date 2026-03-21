# FRAX Company Portal

Employee and sales management portal for FRAX. This application is completely separate from the main FRAX client application.

## What This Portal Does

- **Founder Dashboard**: Manage waitlist, send trial invites, view sales team performance
- **Sales Team Dashboard**: Manage clients, send trial invites, track commissions
- **Waitlist Management**: Collect and manage trial requests
- **Trial Invite System**: Generate and send trial links to potential clients

## Separation of Concerns

This application handles:
- Employee authentication (Founder & Sales Team)
- Waitlist management
- Trial invite generation

The main FRAX app handles:
- Client authentication
- Client subscriptions and features
- Marketplace integrations
- AI chat and analytics

## Architecture

### Database
- Separate PostgreSQL database from FRAX
- Tables: Employee, WaitlistEntry, TrialInvite

### Trial Flow
1. Sales member/Founder sends trial invite from this portal
2. Trial link includes a token
3. Client clicks link and lands on FRAX website
4. FRAX validates token with this portal's API
5. FRAX creates User account with trial subscription
6. Client uses FRAX features for 1 month free

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update `.env` with your values:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SIGNING_SECRET`: Random secret key
- `FRAX_API_URL`: URL of main FRAX app
- `FRAX_API_SECRET`: Shared secret between apps

4. Run database migrations:
```bash
npx prisma migrate dev
```

5. Create founder account:
```bash
npm run create-founder
```

6. Start development server:
```bash
npm run dev
```

Access at: http://localhost:3001

## Development

- Port 3001 (FRAX runs on 3000)
- Founder dashboard: `/founder/dashboard`
- Sales dashboard: `/sales/dashboard`

## Deployment

Deploy separately from FRAX. Both apps can share the same database server but use different databases.
