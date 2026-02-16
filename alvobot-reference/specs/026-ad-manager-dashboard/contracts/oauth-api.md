# API Contract: Ad Manager OAuth

**Feature**: 026-ad-manager-dashboard
**Base URL**: `/ad-manager`

## Overview

OAuth endpoints for connecting Google Ad Manager accounts. Follows the same pattern as existing Google Ads OAuth.

---

## Endpoints

### 1. Initiate OAuth Flow

Generates the Google OAuth authorization URL for Ad Manager.

```
POST /ad-manager/oauth/initiate
```

**Headers**:
```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request Body**:
```typescript
interface InitiateOAuthRequest {
  connectionName: string      // User-provided name for the connection
  workspaceId: string         // Current workspace ID
  reconnectConnectionId?: string // Optional: ID of connection to refresh
}
```

**Response 200**:
```typescript
interface InitiateOAuthResponse {
  authorizationUrl: string    // Full Google OAuth URL to redirect user
}
```

**Example Request**:
```json
{
  "connectionName": "My Ad Manager Account",
  "workspaceId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Example Response**:
```json
{
  "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&scope=https://www.googleapis.com/auth/admanager&state=..."
}
```

**Errors**:
| Code | Description |
|------|-------------|
| 401 | Unauthorized - invalid or expired JWT |
| 400 | Missing required fields |
| 500 | OAuth configuration error |

---

### 2. OAuth Callback

Handles the OAuth callback from Google, exchanges code for tokens.

```
GET /ad-manager/oauth/callback
```

**Query Parameters**:
```typescript
interface OAuthCallbackParams {
  code: string       // Authorization code from Google
  state: string      // Base64url-encoded state with userId, workspaceId, etc.
  error?: string     // Error code if user denied access
}
```

**Response**: Redirects to frontend with result

**Success Redirect**:
```
{FRONTEND_URL}/callback/ad-manager?success=true&connection_id={id}&networks_preview={base64}
```

**Error Redirect**:
```
{FRONTEND_URL}/callback/ad-manager?success=false&error={message}
```

**Backend Processing**:
1. Validate state (check timestamp, nonce)
2. Exchange code for access_token + refresh_token
3. Fetch user info and available networks
4. Create/update connection in database
5. Redirect to frontend

---

### 3. Refresh Token

Manually refresh an expired OAuth token.

```
POST /ad-manager/oauth/refresh/:connectionId
```

**Headers**:
```
Authorization: Bearer <jwt>
```

**Path Parameters**:
- `connectionId`: UUID of the connection

**Response 200**:
```typescript
interface RefreshTokenResponse {
  success: boolean
  expiresAt: string  // ISO timestamp of new token expiry
}
```

**Example Response**:
```json
{
  "success": true,
  "expiresAt": "2026-01-15T15:30:00.000Z"
}
```

**Errors**:
| Code | Description |
|------|-------------|
| 401 | Unauthorized |
| 403 | Not owner of connection |
| 404 | Connection not found |
| 400 | Refresh token invalid/revoked |

---

### 4. Check Configuration Status

Verify OAuth credentials are configured.

```
GET /ad-manager/config/status
```

**Headers**:
```
Authorization: Bearer <jwt>
```

**Response 200**:
```typescript
interface ConfigStatusResponse {
  configured: boolean
  missingFields?: string[]  // e.g., ["GOOGLE_AD_MANAGER_CLIENT_SECRET"]
}
```

**Example Response (configured)**:
```json
{
  "configured": true
}
```

**Example Response (not configured)**:
```json
{
  "configured": false,
  "missingFields": ["GOOGLE_AD_MANAGER_CLIENT_ID", "GOOGLE_AD_MANAGER_CLIENT_SECRET"]
}
```

---

## State Encoding

The OAuth state parameter uses base64url-encoded JSON:

```typescript
interface OAuthState {
  userId: string
  workspaceId: string
  connectionName: string
  nonce: string              // crypto.randomBytes(16).toString('hex')
  timestamp: number          // Date.now()
  reconnectConnectionId?: string
}

// Encoding
const state = Buffer.from(JSON.stringify(stateObj)).toString('base64url')

// Decoding
const stateObj = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'))
```

**Security**: State expires after 10 minutes (check timestamp).

---

## Environment Variables

```bash
# Required for Ad Manager OAuth
GOOGLE_AD_MANAGER_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_AD_MANAGER_CLIENT_SECRET=xxx
GOOGLE_AD_MANAGER_REDIRECT_URI=http://localhost:3001/ad-manager/oauth/callback
```

**Note**: Can potentially reuse Google Ads OAuth credentials if scopes are compatible, but separate credentials recommended for isolation.
