# Upload Gating Implementation

## Überblick

Uploads (Belege, Fotos, Avatare) sollen nur mit aktivem Cloud Plus möglich sein.
Aktuell lädt der Client direkt in Supabase Storage hoch - das muss abgesichert werden.

## Architektur

```
[Client] → [Edge Function] → [Supabase Storage]
           (prüft entitlements)
```

### Was die Edge Function tun muss:

1. **Auth prüfen:** User authenticated?
2. **Family Membership prüfen:** User gehört zu Familie?
3. **Entitlement prüfen:** Cloud Plus aktiv? (`plan='cloud_plus' AND now() < cloud_until`)
4. **Signed Upload URL ausstellen:** Temporäre Upload-URL mit Token
5. **Client lädt via Signed URL hoch**

## Supabase Edge Function (TODO)

Erstelle `supabase/functions/get-upload-url/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // 1. Get auth token
  const authHeader = req.headers.get('Authorization')!
  const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))

  if (!user) return new Response('Unauthorized', { status: 401 })

  // 2. Parse request
  const { bucket, family_id, content_type } = await req.json()

  // 3. Check family membership
  const { data: membership } = await supabaseClient
    .from('family_members')
    .select('id')
    .eq('family_id', family_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) return new Response('Forbidden', { status: 403 })

  // 4. Check Cloud Plus entitlement
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('plan, cloud_until')
    .eq('id', user.id)
    .single()

  const isCloudPlusActive =
    profile.plan === 'cloud_plus' &&
    profile.cloud_until &&
    new Date(profile.cloud_until) > new Date()

  if (!isCloudPlusActive) {
    return new Response(JSON.stringify({ error: 'Cloud Plus required' }), {
      status: 402,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // 5. Generate signed upload URL
  const fileName = `${family_id}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
  const { data: signedData, error } = await supabaseClient.storage
    .from(bucket)
    .createSignedUploadUrl(fileName)

  if (error) throw error

  return new Response(JSON.stringify({
    path: fileName,
    signedUrl: signedData.signedUrl,
    token: signedData.token
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

## Client-seitige Integration

### Aktueller Code (`lib/image-upload.ts`):
```typescript
// UNSAFE - direkter Upload ohne Entitlement-Check
await supabase.storage.from(bucket).upload(filePath, arrayBuffer)
```

### Neuer Code (mit Gating):
```typescript
// 1. Request signed upload URL from Edge Function
const { data: uploadData } = await supabase.functions.invoke('get-upload-url', {
  body: { bucket, family_id, content_type: 'image/jpeg' }
})

if (!uploadData) throw new Error('Upload nicht möglich - Cloud Plus erforderlich')

// 2. Upload via signed URL
await fetch(uploadData.signedUrl, {
  method: 'PUT',
  body: arrayBuffer,
  headers: { 'Content-Type': 'image/jpeg' }
})

// 3. Return path for DB storage
return uploadData.path
```

## UI Integration

In allen Upload-Screens (add-expense, handover, child-info):

```typescript
import { useEntitlements } from '@/hooks/useEntitlements'

const { data: entitlements } = useEntitlements()

if (!entitlements?.canUpload) {
  // Show Cloud Plus Upsell Modal
  router.push('/modal/cloud-plus')
  return
}

// Proceed with upload
```

## Storage RLS Policies

Stelle sicher, dass Storage Buckets keine direkten Uploads erlauben:

```sql
-- receipts bucket: nur via Service Role (Edge Function)
CREATE POLICY "No direct uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (false);

-- Für signed URLs funktioniert trotzdem, da Service Role verwendet wird
```

## Status

- ✅ Entitlements Hook (`useEntitlements`) implementiert
- ✅ UI-Gating vorbereitet (canUpload Flag)
- ⏳ **TODO:** Edge Function erstellen
- ⏳ **TODO:** Client Upload-Logik anpassen
- ⏳ **TODO:** Storage RLS Policies setzen

## Test-Checkliste

1. User mit `plan='trial'` → Upload blockiert, Cloud Plus Modal öffnet
2. User mit `plan='lifetime'` → Upload blockiert, Cloud Plus Modal öffnet
3. User mit `plan='cloud_plus'` und `cloud_until` in Zukunft → Upload funktioniert
4. User mit abgelaufenem Cloud Plus → Upload blockiert

## Kosten-Schätzung

- Edge Function Invocations: ~0.001 € / 1000 Requests
- Supabase Storage: ~0.021 € / GB
- Minimale laufende Kosten bei gated Uploads
