import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UploadRequest {
  family_id: string
  kind: 'receipt' | 'avatar' | 'handover'
  expense_id?: string
  mime: string
  bytes: number
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 2. Get auth token and verify user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 3. Parse request body
    const body: UploadRequest = await req.json()
    const { family_id, kind, expense_id, mime, bytes } = body

    // 4. Validate input
    if (!family_id || !kind || !mime || !bytes) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 5. Validate file size (10MB max)
    if (bytes > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'File too large (max 10MB)' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 6. Validate MIME type (allowlist)
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedMimes.includes(mime)) {
      return new Response(JSON.stringify({ error: 'Invalid MIME type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 7. Check family membership
    const { data: membership } = await supabaseAdmin
      .from('family_members')
      .select('id')
      .eq('family_id', family_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return new Response(JSON.stringify({ error: 'Not a family member' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 8. Check Cloud Plus entitlement
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('plan, cloud_until')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const isCloudPlusActive =
      profile.plan === 'cloud_plus' &&
      profile.cloud_until &&
      new Date(profile.cloud_until) > new Date()

    if (!isCloudPlusActive) {
      return new Response(JSON.stringify({ error: 'Cloud Plus required', code: 'CLOUD_PLUS_REQUIRED' }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 9. Map kind to bucket
    const bucketMap: Record<string, string> = {
      receipt: 'receipts',
      avatar: 'avatars',
      handover: 'handover-photos'
    }
    const bucket = bucketMap[kind]

    // 10. Generate file path
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
    const extension = mime.split('/')[1]

    let path: string
    if (kind === 'receipt' && expense_id) {
      path = `families/${family_id}/receipts/${expense_id}/${timestamp}_${random}.${extension}`
    } else if (kind === 'avatar') {
      path = `families/${family_id}/avatars/${timestamp}_${random}.${extension}`
    } else {
      path = `families/${family_id}/handover/${timestamp}_${random}.${extension}`
    }

    // 11. Create signed upload URL
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from(bucket)
      .createSignedUploadUrl(path)

    if (uploadError) {
      console.error('Signed upload URL error:', uploadError)
      return new Response(JSON.stringify({ error: 'Failed to create upload URL' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 12. Return response
    return new Response(JSON.stringify({
      bucket,
      path,
      signedUrl: uploadData.signedUrl,
      token: uploadData.token,
      expiresIn: 600 // 10 minutes
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in create_upload_url:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
