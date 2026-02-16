# Quick Start: Bug Report System

**Feature**: 021-bug-report-system
**Date**: 2026-01-07

## Prerequisites

- AlvoBot running locally (frontend + backend)
- Supabase project configured
- Access to Supabase Dashboard

---

## Step 1: Database Migration

Run the migration to create bug report tables.

```sql
-- Execute in Supabase SQL Editor or via migration
-- See: database/migrations/003_bug_reports.sql
```

**Tables created:**
- `bug_reports` - Main entity
- `bug_report_attachments` - Files and media
- `bug_report_settings` - User preferences

**Verify:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'bug_report%';
```

---

## Step 2: Supabase Storage Bucket

Create the storage bucket for bug report attachments.

**Via Supabase Dashboard:**
1. Go to Storage → New Bucket
2. Name: `bug-reports`
3. Public: Yes (for screenshot sharing in ClickUp emails)
4. File size limit: 10MB

**Via SQL:**
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('bug-reports', 'bug-reports', true, 10485760);
```

**Storage Policies:**
```sql
-- Users can upload to their own folder
CREATE POLICY "Users upload own files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'bug-reports'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can read their own files
CREATE POLICY "Users read own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'bug-reports'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Public read for shared screenshots
CREATE POLICY "Public read for bug reports"
ON storage.objects FOR SELECT
USING (bucket_id = 'bug-reports');
```

---

## Step 3: Install Frontend Dependencies

```bash
cd frontend
npm install html2canvas
```

---

## Step 4: Add BugReportButton to MainLayout

Edit `frontend/src/shared/layouts/MainLayout/MainLayout.tsx`:

```tsx
import { BugReportButton } from '@/features/bug-report/components';

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className={styles.layout}>
      <Header />
      <Sidebar />
      <main className={styles.main}>
        {children}
      </main>
      <BugReportButton /> {/* Add this line */}
    </div>
  );
}
```

---

## Step 5: Add Route for Bug Reports History

Edit `frontend/src/app/router.tsx`:

```tsx
const BugReportsPage = lazy(() =>
  import('@/features/bug-report/pages/BugReportsPage')
);

// Add to protected routes
{
  path: '/bug-reports',
  element: <BugReportsPage />,
},
```

---

## Step 6: Backend Module (Optional - for ClickUp)

If using ClickUp integration:

1. Ensure Resend is configured in backend `.env`:
```env
RESEND_API_KEY=re_xxxxx
```

2. Register BugReportModule in `app.module.ts`:
```typescript
import { BugReportModule } from './modules/bug-report/bug-report.module';

@Module({
  imports: [
    // ... other modules
    BugReportModule,
  ],
})
export class AppModule {}
```

---

## Step 7: Test the Feature

### Test Screenshot Capture

1. Login to the app
2. Navigate to any page
3. Click the bug icon (bottom right)
4. Verify screenshot is captured automatically
5. Fill description, select severity and type
6. Submit and verify in database

### Test Video Recording (Chrome/Firefox/Edge)

1. Open bug report modal
2. Click "Record Screen"
3. Allow screen sharing permission
4. Perform some actions
5. Stop recording
6. Verify video preview appears
7. Submit and verify in storage

### Test ClickUp Integration

1. Go to Settings → Bug Report
2. Enter your ClickUp List email (list.xxx@tasks.clickup.com)
3. Create a new bug report
4. Check ClickUp for new task

---

## Configuration Options

### User Settings (stored in bug_report_settings)

| Setting | Description | Default |
|---------|-------------|---------|
| clickup_email | ClickUp List email for task creation | null |
| button_collapsed | Whether bug button is minimized | false |

### Environment Variables

**Frontend:** None required (uses existing Supabase config)

**Backend:**
```env
# Required for ClickUp email integration
RESEND_API_KEY=re_xxxxx
```

---

## Troubleshooting

### Screenshot not capturing correctly

- **Cause:** Cross-origin images or iframes
- **Solution:** These elements will appear blank; this is expected behavior

### Video recording not available

- **Cause:** Browser doesn't support getDisplayMedia
- **Solution:** Use Chrome, Firefox, or Edge desktop. Not supported on mobile.

### ClickUp task not created

- **Cause:** Invalid email format or ClickUp configuration
- **Solution:** Verify email is in format `list.xxx@tasks.clickup.com`

### Upload fails

- **Cause:** File too large or wrong type
- **Solution:** Check file is under 10MB and allowed type

---

## Next Steps

After setup, the feature is ready for use. See [spec.md](./spec.md) for full feature description and [api.md](./contracts/api.md) for API details.
