# Quickstart: Google AdSense Integration

## Prerequisites

- Node.js 18+ installed
- Access to the AlvoBot repository
- Google Cloud Console access (for OAuth credentials)
- Supabase project configured

## 1. Environment Setup

### Backend (.env)

No new environment variables required. AdSense uses existing Google OAuth credentials:

```bash
# Existing variables (already configured)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Or Ad Manager specific (takes priority if set)
GOOGLE_AD_MANAGER_CLIENT_ID=your-client-id
GOOGLE_AD_MANAGER_CLIENT_SECRET=your-client-secret
```

### Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create new)
3. Navigate to **APIs & Services > Library**
4. Enable **AdSense Management API**
5. Navigate to **APIs & Services > Credentials**
6. Add authorized redirect URI: `http://localhost:3001/adsense/oauth/callback`

## 2. Development Server

```bash
# Terminal 1: Backend
cd backend
npm install
npm run start:dev

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

## 3. File Structure to Create

### Backend

```bash
# Create AdSense module structure
mkdir -p backend/src/modules/adsense/{services,dto}

# Files to create:
# backend/src/modules/adsense/
#   ├── adsense.module.ts
#   ├── adsense.controller.ts
#   ├── services/
#   │   ├── adsense-oauth.service.ts
#   │   ├── adsense-api.service.ts
#   │   └── index.ts
#   └── dto/
#       ├── adsense-report.dto.ts
#       └── index.ts
```

### Frontend

```bash
# Rename ad-manager-dashboard to revenue-dashboard
mv frontend/src/features/ad-manager-dashboard frontend/src/features/revenue-dashboard

# Create new components
mkdir -p frontend/src/features/revenue-dashboard/components/{RevenueSourceFilter,RevenueSummaryCards}

# Create callback page
touch frontend/src/features/connections/pages/AdSenseCallbackPage.tsx
```

## 4. Key Implementation Steps

### Step 1: Backend AdSense Module

Create `backend/src/modules/adsense/adsense.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdSenseController } from './adsense.controller';
import { AdSenseOAuthService } from './services/adsense-oauth.service';
import { AdSenseApiService } from './services/adsense-api.service';

@Module({
  imports: [ConfigModule],
  controllers: [AdSenseController],
  providers: [AdSenseOAuthService, AdSenseApiService],
  exports: [AdSenseOAuthService, AdSenseApiService],
})
export class AdSenseModule {}
```

### Step 2: Register Module in App

Update `backend/src/app.module.ts`:

```typescript
import { AdSenseModule } from './modules/adsense/adsense.module';

@Module({
  imports: [
    // ... existing modules
    AdSenseModule,
  ],
})
export class AppModule {}
```

### Step 3: Update Sidebar

Update `frontend/src/shared/layouts/MainLayout/Sidebar.tsx`:

```typescript
// Change Ad Manager menu item
{
  path: '/receita',
  label: 'Receita',
  icon: <DollarSign className="w-5 h-5" />
}
```

### Step 4: Update Router

Update `frontend/src/app/router.tsx`:

```typescript
// Add AdSense callback route
{
  path: '/callback/adsense',
  element: <AdSenseCallbackPage />
}

// Rename route with redirect
{
  path: '/receita',
  element: <RevenueDashboardPage />
},
{
  path: '/ad-manager',
  element: <Navigate to="/receita" replace />
}
```

## 5. Testing the Integration

### Test OAuth Flow

1. Navigate to `/connections`
2. Click "Nova Conexão"
3. Enter connection name
4. Select "Google"
5. Select "Google AdSense"
6. Complete OAuth flow
7. Verify connection appears in list with badge

### Test Dashboard

1. Navigate to `/receita`
2. Select an AdSense connection
3. Select an account
4. Verify data loads with skeleton loaders
5. Test source filter (Todas, Ad Manager, AdSense)

## 6. Debugging Tips

### OAuth Issues

```bash
# Check backend logs
cd backend && npm run start:dev 2>&1 | grep -i adsense

# Verify OAuth state
# State is base64url encoded, decode to inspect:
echo "STATE_STRING" | base64 -d
```

### API Issues

```bash
# Test AdSense API directly
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  "https://adsense.googleapis.com/v2/accounts"
```

### Connection Issues

```sql
-- Check connections in Supabase
SELECT id, connection_name, plataform_name, metadata->>'type' as type, is_active
FROM connections
WHERE plataform_name = 'google'
ORDER BY created_at DESC;
```

## 7. Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `OAuth state expired` | Took >10 min to complete flow | Start OAuth again |
| `No AdSense account` | Google account has no AdSense | Use account with AdSense access |
| `Insufficient scopes` | OAuth didn't include AdSense scope | Check scope configuration |
| `Token refresh failed` | Refresh token revoked | Reconnect the connection |

## 8. Reference Files

### Existing Patterns to Follow

- **OAuth Service**: `backend/src/modules/ad-manager/services/ad-manager-oauth.service.ts`
- **Controller**: `backend/src/modules/ad-manager/ad-manager.controller.ts`
- **Frontend API**: `frontend/src/features/ad-manager-dashboard/api/queries.ts`
- **Dashboard Page**: `frontend/src/features/ad-manager-dashboard/pages/AdManagerDashboardPage.tsx`

### API Documentation

- [AdSense Management API v2](https://developers.google.com/adsense/management/reference/rest)
- [OAuth 2.0 Scopes](https://developers.google.com/identity/protocols/oauth2/scopes#adsense)

## 9. Checklist

- [ ] Backend module created and registered
- [ ] OAuth endpoints working (`/adsense/oauth/initiate`, `/adsense/oauth/callback`)
- [ ] Accounts endpoint working (`/adsense/accounts`)
- [ ] Report endpoint working (`/adsense/report`)
- [ ] Frontend callback page created
- [ ] Connection modal updated with Google sub-selection
- [ ] Sidebar renamed to "Receita"
- [ ] Dashboard shows both sources
- [ ] Source filter working
- [ ] Summary cards showing combined totals
- [ ] Service badges showing on connections list
