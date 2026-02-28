# SheerID Verification Tool Dashboard

## Overview
A full-stack web application that provides a dashboard interface for managing and monitoring SheerID verification tools. Built with React, Express, PostgreSQL, and TypeScript. Implements the real multi-step waterfall verification flow matching both reference implementations (tgbot-verify-main and SheerID-Verification-Tool-Platinum) exactly.

## Architecture
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui components
- **Backend**: Express.js API server
- **Verification Engine**: `server/sheerid-engine.ts` - Full waterfall verification matching both reference zips exactly
- **Document Generation**: puppeteer-core + system Chromium (NixOS) for HTML-to-PNG enrollment/employment verification letters
- **School Selection**: Hardcoded PSU campus IDs (student/teacher) and Springfield High School IDs (K12) — NO org search API used
- **Anti-Detect Headers**: clientversion, clientname, x-sheerid-target-platform, NewRelic trace headers
- **Browser**: Uses system-installed Chromium via `puppeteer-core` (not bundled `puppeteer`)
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter for client-side routing

## Project Structure
- `client/src/pages/` - Dashboard, Tools, History, Universities, Docs pages
- `client/src/components/` - Reusable UI components (tool-card, stat-card, run-verification-dialog, tool-detail-panel, verification-table, activity-chart)
- `server/sheerid-engine.ts` - Full waterfall SheerID verification engine with reference-matching payloads
- `server/routes.ts` - API endpoints using the verification engine
- `server/storage.ts` - Database storage layer with chart data queries
- `server/seed.ts` - Database seed data (tools + universities + PSU campuses)
- `server/telegram-bot.ts` - Telegram bot integrated with Replit dashboard
- `bot-standalone.mjs` - Standalone Telegram bot for GitHub Actions (no PostgreSQL)
- `shared/schema.ts` - Drizzle schema definitions

## Key Features
- Dashboard with real statistics from DB and activity charts from actual verification records
- 8 verification tools (Spotify, YouTube, Gemini, Bolt.new, Canva, ChatGPT, Military, Chrome Extension)
- Full waterfall verification flow matching both reference zips exactly
- Auto-generate identity: names, emails, DOB, document images
- Hardcoded PSU campus org IDs (student/teacher) and K12 high school IDs from reference configs
- Anti-detect headers: clientversion 2.193.0, clientname jslib, NewRelic tracking, Chrome 131 user-agents
- Tool enable/disable toggle
- University database with add/delete functionality
- Verification history with URL tracking, error tooltips, status indicators, waterfall step details
- Documentation page with API reference
- Dark/light theme support
- Sidebar navigation

## Critical Verification Details (from reference zips)

### Student Tools (Spotify/YouTube/Gemini)
- PSU campus org IDs: 2565, 651379, 8387, 8382, 8396, 8379, 2560, 650600, 8388, 8394
- Email format: `firstname.lastnameNNNN@psu.edu`
- birthDate: YYYY-MM-DD (2000-2005 range)
- flags: `collect-info-step-email-first`, `doc-upload-considerations`, `doc-upload-may24`, `docUpload-assertion-checklist`, `font-size`, `include-cvec-field-france-student`
- marketConsentValue: false
- Upload: 1 document (student enrollment verification PNG)
- Step: collectStudentPersonalInfo

### Teacher Tools (Bolt.new/Canva)
- PSU campus org IDs (same as student)
- birthDate: empty string ""
- externalUserId: parsed from URL or random 7-digit
- flags: `doc-upload-considerations`, `doc-upload-may24`, `docUpload-assertion-checklist`, `include-cvec-field-france-student`, `org-search-overlay`, `org-selected-display`
- marketConsentValue: true
- refererUrl: installPageUrl (the original URL)
- Upload: 2 documents (teacher ID card PNG + employment verification letter PNG)
- Step: collectTeacherPersonalInfo

### K12 Teacher (ChatGPT)
- Springfield High School org IDs: 3995910, 3995271, 3992142, 3996208, 4015002, 4015001, 4014999
- Type: HIGH_SCHOOL (not UNIVERSITY)
- Upload: 2 documents (employment verification PNG + teacher badge PNG)
- Step: collectTeacherPersonalInfo

## Tool Configurations (from zip)
- Student tools (Spotify, YouTube, Gemini): programId `67c8c14f5f17a83b745e3f82`, `collectStudentPersonalInfo`
- Teacher tools (Bolt.new, Canva): programId `68cc6a2e64f55220de204448`, `collectTeacherPersonalInfo`
- K12 teacher (ChatGPT): programId `68d47554aa292d20b9bec8f7`, `collectTeacherPersonalInfo`

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

## Telegram Bot
- **Bot**: @shs_ai_assistant_bot
- **File**: `server/telegram-bot.ts` - Telegram bot using node-telegram-bot-api with polling
- **Admin**: @Aamoviesadmin (full control: add/remove tokens, giveaways, user management)
- **Channel**: @aamoviesofficial (users must join to unlock features)
- **Token Economy**: Join reward (20), daily bonus (5), referral reward (10), verification cost (50)
- **Commands**: /start, /daily, /verify {link}, /balance, /referral, /admin
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

## GitHub Actions Bot Runner
- **File**: `bot-standalone.mjs` - Self-contained Telegram bot with in-memory storage (no PostgreSQL needed)
- **Workflow**: `.github/workflows/bot.yml` - Runs on ubuntu-latest with Node.js 18
- **Triggers**: Manual (workflow_dispatch) + Scheduled (every 30 minutes cron)
- **Execution**: Infinite loop keeps bot alive; 5-hour sleep cycle prevents GitHub Actions timeout
- **Secrets Required**: BOT_TOKEN (Telegram Bot Token) in GitHub repo Settings > Secrets > Actions
- **Optional Secrets**: TELEGRAM_ADMIN_USERNAME, TELEGRAM_CHANNEL_ID
