# Edge Functions Deployment Guide

## Prerequisites

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link your project:
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

## Deploy Functions

### Deploy all functions at once:
```bash
cd supabase/functions

supabase functions deploy create_upload_url
supabase functions deploy create_download_url
supabase functions deploy settle_family
```

### Deploy individually (for updates):
```bash
supabase functions deploy create_upload_url --no-verify-jwt
supabase functions deploy create_download_url --no-verify-jwt
supabase functions deploy settle_family --no-verify-jwt
```

## Environment Variables

Edge Functions need access to:
- `SUPABASE_URL` (auto-provided)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-provided)

No additional secrets needed.

## Test Functions

### Test create_upload_url:
```bash
# Get your JWT token from app (console.log)
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/create_upload_url \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "family_id": "your-family-uuid",
    "kind": "receipt",
    "mime": "image/jpeg",
    "bytes": 100000
  }'
```

Expected response:
```json
{
  "bucket": "receipts",
  "path": "families/.../receipts/.../timestamp_random.jpg",
  "signedUrl": "https://...signed-upload-url...",
  "token": "...",
  "expiresIn": 600
}
```

### Test create_download_url:
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/create_download_url \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "family_id": "your-family-uuid",
    "bucket": "receipts",
    "path": "families/.../receipts/.../file.jpg"
  }'
```

Expected response:
```json
{
  "signedUrl": "https://...signed-download-url...",
  "expiresIn": 600
}
```

### Test settle_family:
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/settle_family \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "family_id": "your-family-uuid"
  }'
```

Expected response:
```json
{
  "success": true,
  "deletedCount": 5,
  "deletedFiles": 3,
  "failedFiles": 0,
  "otherParentId": "other-parent-uuid",
  "currentUserName": "Your Name"
}
```

## View Logs

```bash
supabase functions logs create_upload_url
supabase functions logs create_download_url
supabase functions logs settle_family
```

## Common Errors

### 1. "CORS error"
- Functions include CORS headers, but check browser console
- Use OPTIONS preflight check

### 2. "Unauthorized"
- JWT token invalid or expired
- Check Authorization header format: `Bearer <token>`

### 3. "Cloud Plus required"
- Expected behavior for Trial/Lifetime users
- Test with `grant_cloud_plus(user_id, 1)` SQL function

### 4. "Failed to create signed URL"
- Check Storage buckets exist (receipts, avatars, handover-photos)
- Check Service Role Key has access

## Update Functions

After code changes:
```bash
supabase functions deploy <function-name>
```

No need to redeploy if only client code changed.
