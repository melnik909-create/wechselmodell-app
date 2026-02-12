import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DownloadRequest {
  family_id: string
  bucket: string
  path: string
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
    const body: DownloadRequest = await req.json()
    const { family_id, bucket, path } = body

    // 4. Validate input
    if (!family_id || !bucket || !path) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 5. Validate path prefix (security check)
    if (!path.startsWith(`families/${family_id}/`)) {
      return new Response(JSON.stringify({ error: 'Invalid path' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 6. Check family membership
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

    // 7. Check Cloud Plus entitlement
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

    // 8. Create signed download URL (10 minutes)
    const { data: downloadData, error: downloadError } = await supabaseAdmin
      .storage
      .from(bucket)
      .createSignedUrl(path, 600)

    if (downloadError) {
      console.error('Signed download URL error:', downloadError)
      return new Response(JSON.stringify({ error: 'Failed to create download URL' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 9. Return response
    return new Response(JSON.stringify({
      signedUrl: downloadData.signedUrl,
      expiresIn: 600
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in create_download_url:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
