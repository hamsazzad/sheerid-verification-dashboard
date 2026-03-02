# SheerID Verification Tool Dashboard

## Overview
A full-stack web application that provides a dashboard interface for managing and monitoring SheerID verification tools. Built with React, Express, PostgreSQL, and TypeScript. Implements the real multi-step waterfall verification flow matching the reference implementation exactly.

## Architecture
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui components
- **Backend**: Express.js API server
- **Verification Engine**: `server/sheerid-engine.ts` - Full waterfall verification with state-aware step handling
- **Document Generation**: puppeteer-core + system Chromium (NixOS) for HTML-to-PNG simple documents (student ID cards, transcripts, teacher badges)
- **School Selection**: Hardcoded PSU campus IDs (student/teacher) and real K12 high school IDs from reference (Stuyvesant, Brooklyn Tech, Thomas Jefferson, etc.)
- **Anti-Detect Headers**: clientversion, clientname, x-sheerid-target-platform, NewRelic trace headers
- **Browser**: Uses system-installed Chromium via `puppeteer-core` (not bundled `puppeteer`)
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter for client-side routing

## Project Structure
- `client/src/pages/` - Dashboard, Tools, History, Universities, Docs pages
- `client/src/components/` - Reusable UI components (tool-card, stat-card, run-verification-dialog, tool-detail-panel, verification-table, activity-chart)
- `server/sheerid-engine.ts` - Full waterfall SheerID verification engine with state-aware step handling
- `server/routes.ts` - API endpoints using the verification engine
- `server/storage.ts` - Database storage layer with chart data queries
- `server/seed.ts` - Database seed data (tools + universities + PSU campuses)
- `server/telegram-bot.ts` - Telegram bot integrated with Replit dashboard
- `bot-standalone.mjs` - Standalone Telegram bot for GitHub Actions (no PostgreSQL)
- `shared/schema.ts` - Drizzle schema definitions

## Key Features
- Dashboard with real statistics from DB and activity charts from actual verification records
- 8 verification tools (Spotify, YouTube, Gemini, Bolt.new, Canva, ChatGPT, Military, Chrome Extension)
- State-aware verification: GETs current step before acting, handles docUpload/sso/emailLoop states
- Auto-generate identity: names, emails, DOB, document images
- Simple PIL-style documents matching reference: student ID cards (650x400), transcripts (850x1100), teacher badges (650x400)
- K12 schools use real SheerID org IDs from reference (Stuyvesant 155694, Brooklyn Tech 157582, etc.)
- Anti-detect headers: clientversion 2.193.0, clientname jslib, NewRelic tracking, Chrome 131 user-agents
- Tool enable/disable toggle
- University database with add/delete functionality
- Verification history with URL tracking, error tooltips, status indicators, waterfall step details
- Documentation page with API reference
- Dark/light theme support
- Sidebar navigation

## Critical Verification Flow
1. **GET verification state** - Check currentStep before doing anything
2. **If at collectPersonalInfo** - Submit personal info, then check for auto-pass
3. **If at sso** - Skip SSO via DELETE
4. **If at docUpload** - Skip personal info, go straight to document upload
5. **If at success/pending/error** - Return immediately with appropriate status
6. **If at emailLoop** - Return error, need new verification link
7. **Upload documents** - POST docUpload to get S3 URLs, PUT to S3, POST completeDocUpload

## Document Types (matching reference)
- **Student**: 70% academic transcript (850x1100) / 30% student ID card (650x400)
- **Teacher**: Teacher ID card + employment verification letter
- **K12**: Simple teacher badge (650x400) with green header, photo box, info fields, barcode

## Critical Verification Details

### Student Tools (Spotify/YouTube/Gemini)
- PSU campus org IDs: 2565, 651379, 8387, 8382, 8396, 8379, 2560, 650600, 8388, 8394
- Email format: `firstname.lastnameNNNN@psu.edu`
- birthDate: YYYY-MM-DD (2000-2005 range)
- country: "US" explicitly set in personalInfoBody
- **Gemini (one-verify)**: `usaOnly: true` — always uses PSU Main Campus (id: 2565)

### Teacher Tools (Bolt.new/Canva)
- PSU campus org IDs (same as student)
- birthDate: empty string ""
- externalUserId: parsed from URL or random 7-digit
- Upload: 2 documents (teacher ID card PNG + employment verification letter PNG)

### K12 Teacher (ChatGPT)
- Real K12 school org IDs: Stuyvesant (155694), Brooklyn Tech (157582), Thomas Jefferson (3704245), Walter Payton (3521141), etc.
- Type: K12 (may auto-approve without document upload)
- Upload: 1 document (simple teacher badge PNG)
- Handles emailLoop step

## Tool Configurations
- Student tools (Spotify, YouTube, Gemini): programId `67c8c14f5f17a83b745e3f82`, `collectStudentPersonalInfo`
- Teacher tools (Bolt.new, Canva): programId `68cc6a2e64f55220de204448`, `collectTeacherPersonalInfo`
- K12 teacher (ChatGPT): programId `68d47554aa292d20b9bec8f7`, `collectTeacherPersonalInfo`

## Admin Panel
- **Route**: `/admin` - Standalone admin page (no sidebar)
- **Auth**: Token-based (Bearer token in Authorization header)
- **Login**: POST /api/admin/login with email/password → returns JWT-like token
- **Session**: In-memory Map with 24h expiry
- **Features**: Stats overview, tool breakdown, verification history with search, document image preview, waterfall step viewer
- **Document Images**: Stored as base64 in jsonb `documentImages` column, rendered inline in admin panel

## API Endpoints
- GET /api/dashboard - Combined dashboard data with real chart data from DB
- GET /api/tools - List all tools
- PATCH /api/tools/:id/toggle - Toggle tool active/disabled state
- GET /api/verifications - List verification history
- POST /api/verifications/run - Run full waterfall verification (auto-generate supported)
- GET /api/verifications/:id/status - Check SheerID verification status
- GET /api/stats - Tool statistics
- GET /api/universities - University database
- POST /api/universities - Add a university
- DELETE /api/universities/:id - Delete a university
- POST /api/admin/login - Admin login (returns token)
- GET /api/admin/me - Check admin session
- POST /api/admin/logout - Admin logout
- GET /api/admin/verifications - All verifications (admin only)
- GET /api/admin/verifications/:id - Single verification details (admin only)
- GET /api/admin/stats - Admin stats with tool breakdown (admin only)

## Bot API Endpoints (auth: Bearer TELEGRAM_BOT_TOKEN)
- GET /api/bot/user/:telegramId - Get bot user
- GET /api/bot/user/referral/:code - Get user by referral code
- POST /api/bot/user - Create bot user
- PATCH /api/bot/user/:telegramId - Update bot user
- POST /api/bot/user/:telegramId/addtokens - Add tokens
- POST /api/bot/user/:telegramId/deducttokens - Deduct tokens
- GET /api/bot/users - List all bot users

## Telegram Bot
- **Bot**: @shs_ai_assistant_bot
- **File**: `server/telegram-bot.ts` - Telegram bot using node-telegram-bot-api with polling
- **Admin**: @Aamoviesadmin (full control: add/remove tokens, giveaways, user management)
- **Channel**: @aamoviesofficial (users must join to unlock features)
- **Token Economy**: Join reward (20), daily bonus (5), referral reward (10), verification cost (50)
- **Commands**: /start, /daily, /verify {link}, /balance, /referral, /admin
- **AI**: DeepSeek-R1 via asmodeus.free.nf — auto-replies to all non-command messages
- **Anti-abuse**: 24h daily limit, duplicate referral prevention, channel membership check

## Database Tables
- tools - Verification tool definitions (with isActive toggle)
- verifications - Verification attempt records (with url, proxy, firstName, lastName, birthDate, organizationId, sheeridVerificationId)
- stats - Aggregated statistics per tool (computed from real verification runs)
- universities - University database with SheerID org IDs, weights and success rates (includes PSU campuses)
- telegram_users - Telegram bot users (telegramId, tokens, referralCode, referredBy, hasJoinedChannel, lastDaily)

## GitHub Repositories
- **Dashboard (full project)**: https://github.com/hamsazzad/sheerid-verification-dashboard
- **Telegram Bot (standalone)**: https://github.com/hamsazzad/sheerid-telegram-bot

## GitHub Actions Bot Runner (Relay Architecture)
- **Flow**: Bot (Telegram) → GitHub Actions → https://sheer-id-verify.replit.app
- **File**: `bot-standalone.mjs` - Relay bot with PERSISTENT storage via Replit API
- **Bot stores all data via Replit API**: User registration, tokens, referrals, admin commands → PostgreSQL (never resets)
- **Bot forwards verifications to Replit**: /verify requests → POST to `https://sheer-id-verify.replit.app/api/verifications/run`
- **AI Integration**: DeepSeek-R1 model for automatic replies to non-command messages via asmodeus.free.nf
- **Replit server handles**: Identity generation, document creation, SheerID API calls, polling, DB storage, bot user persistence
- **Workflow**: `.github/workflows/bot.yml` - Runs on ubuntu-latest with Node.js 18
- **Triggers**: Manual (workflow_dispatch) + Scheduled (every 30 minutes cron)
- **Concurrency**: `group: telegram-bot, cancel-in-progress: true` — ensures only ONE bot instance runs at a time
- **Execution**: Infinite loop keeps bot alive; 5-hour sleep cycle prevents GitHub Actions timeout
- **Secrets Required**: BOT_TOKEN (Telegram Bot Token) in GitHub repo Settings > Secrets > Actions
- **IMPORTANT**: Do NOT modify the Replit server. GitHub only acts as host/trigger.
