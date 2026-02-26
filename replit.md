# SheerID Verification Tool Dashboard

## Overview
A full-stack web application that provides a dashboard interface for managing and monitoring SheerID verification tools. Built with React, Express, PostgreSQL, and TypeScript. Implements the real multi-step waterfall verification flow matching the tgbot-verify Python bot exactly.

## Architecture
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui components
- **Backend**: Express.js API server
- **Verification Engine**: `server/sheerid-engine.ts` - Full waterfall verification matching tgbot-verify zip
- **Document Generation**: puppeteer-core + system Chromium (NixOS) for HTML-to-PNG enrollment/employment verification letters
- **Organization Lookup**: Real-time SheerID API org search to resolve correct organization IDs
- **Browser**: Uses system-installed Chromium via `puppeteer-core` (not bundled `puppeteer`)
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter for client-side routing

## Project Structure
- `client/src/pages/` - Dashboard, Tools, History, Universities, Docs pages
- `client/src/components/` - Reusable UI components (tool-card, stat-card, run-verification-dialog, tool-detail-panel, verification-table, activity-chart)
- `server/sheerid-engine.ts` - Full waterfall SheerID verification engine with auto-generation
- `server/routes.ts` - API endpoints using the verification engine
- `server/storage.ts` - Database storage layer with chart data queries
- `server/seed.ts` - Database seed data (tools + universities + PSU campuses)
- `shared/schema.ts` - Drizzle schema definitions

## Key Features
- Dashboard with real statistics from DB and activity charts from actual verification records
- 8 verification tools (Spotify, YouTube, Gemini, Bolt.new, Canva, ChatGPT, Military, Chrome Extension)
- Full waterfall verification flow matching tgbot-verify zip exactly
- Auto-generate identity: names, emails, DOB, document images
- Weighted university selection with PSU campus variants from zip
- Tool enable/disable toggle
- University database with add/delete functionality
- Verification history with URL tracking, error tooltips, status indicators, waterfall step details
- Documentation page with API reference
- Dark/light theme support
- Sidebar navigation

## Verification Flow (Waterfall)
1. User provides SheerID URL with `verificationId=<hex>` parameter
2. Identity auto-generated or user-provided (real names from common name lists, emails, DOB)
3. Organization resolved via SheerID API search (`/rest/v2/verification/{id}/organization?searchTerm=...`) to get correct orgId
4. Document image generated (enrollment/employment verification letter matching university name)
5. POST to `collectStudentPersonalInfo` or `collectTeacherPersonalInfo` with resolved org data + device fingerprint
6. DELETE `/step/sso` to skip SSO
7. POST `/step/docUpload` with file metadata to get S3 upload URL
8. PUT to S3 upload URL with document image
9. POST `/step/completeDocUpload` to finalize
10. If pending (doc review), server polls SheerID every 10s (up to 5 min) until final success/failed
11. Result persisted to DB, stats incremented only for definitive success/failed

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
