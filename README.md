# B2B SaaS Website Feedback & Approval Tool

## Structure
- `apps/web`: Next.js (App Router)
- `apps/api`: Express + Prisma (PostgreSQL)

## Quick Start
```bash
npm install
npm run dev
```

## MVP Verification (Curl)

**Note for Windows (CMD/PowerShell)**: Use these single-line commands to avoid syntax errors.

### 1. Create a Project (Simulate Owner)
```bash
curl -X POST http://localhost:4000/projects -H "Content-Type: application/json" -H "x-owner-email: demo@example.com" -d "{\"name\":\"My SaaS\",\"baseUrl\":\"https://example.com/\"}"
```
*Expected: Returns project object. Note baseUrl is normalized (no trailing slash).*

### 2. Generate/Get Feedback Link
```bash
# Replace :projectId with actual ID
curl -X POST http://localhost:4000/projects/:projectId/feedback-link -H "x-owner-email: demo@example.com"
```
*Expected: Returns { token, url }.*

### 3. Public: Validate Token
```bash
# Replace :token (e.g. from step 2)
curl http://localhost:4000/f/:token
```
*Expected: { project: {...}, link: { isActive: true } }. NO TOKEN in response.*

### 4. Public: Post Comment
```bash
curl -X POST http://localhost:4000/f/:token/comments -H "Content-Type: application/json" -d "{\"pageUrl\":\"/pricing\",\"clickX\":100,\"clickY\":200,\"message\":\"Fix this typo\"}"
```
*Expected: Created comment.*

### 5. Owner: List Comments
```bash
curl http://localhost:4000/projects/:projectId -H "x-owner-email: demo@example.com"
```
*Expected: List including the new comment.*
