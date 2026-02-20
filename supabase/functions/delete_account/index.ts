import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function extractStoragePath(value: string): string {
  let path = value
  if (path.includes('/storage/v1/object/')) {
    const parts = path.split('/storage/v1/object/')
    if (parts.length > 1) {
      const bucketAndPath = parts[1]
      const pathParts = bucketAndPath.split('/')
      pathParts.shift()
      path = pathParts.join('/')
    }
  }
  return path
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1) Get memberships (if the user is in no family, we still delete profile/auth)
    const { data: memberships } = await supabaseAdmin
      .from('family_members')
      .select('family_id')
      .eq('user_id', user.id)

    const familyIds = Array.from(new Set((memberships ?? []).map((m) => m.family_id)))

    const log: Record<string, number> = {}

    // Helper: safe delete from optional tables (ignores if table doesn't exist)
    async function safeDelete(table: string, filters: Record<string, string>) {
      try {
        let q = supabaseAdmin.from(table).delete({ count: 'exact' })
        for (const [k, v] of Object.entries(filters)) q = q.eq(k, v)
        const { count } = await q
        log[table] = (log[table] ?? 0) + (count ?? 0)
      } catch { /* table may not exist */ }
    }

    async function safeUpdate(table: string, updates: Record<string, unknown>, filters: Record<string, string>) {
      try {
        let q = supabaseAdmin.from(table).update(updates)
        for (const [k, v] of Object.entries(filters)) q = q.eq(k, v)
        await q
      } catch { /* ignore */ }
    }

    // 1) Delete user's event_attendances
    await safeDelete('event_attendances', { user_id: user.id })

    // 2) Delete user's push_tokens
    await safeDelete('push_tokens', { user_id: user.id })

    // 3) Delete user's documents
    try {
      const { data: docs } = await supabaseAdmin
        .from('documents')
        .select('id, file_url')
        .eq('uploaded_by', user.id)
      const docPaths = (docs ?? []).map((d) => d.file_url).filter(Boolean).map((u) => extractStoragePath(u as string))
      if (docPaths.length > 0) {
        await supabaseAdmin.storage.from('documents').remove(docPaths)
      }
      await safeDelete('documents', { uploaded_by: user.id })
    } catch { /* ignore */ }

    for (const familyId of familyIds) {
      // Expenses + receipts in storage
      try {
        const { data: expenses } = await supabaseAdmin
          .from('expenses')
          .select('id, receipt_url')
          .eq('family_id', familyId)
          .eq('paid_by', user.id)

        const receiptPaths = (expenses ?? [])
          .map((e) => e.receipt_url)
          .filter(Boolean)
          .map((u) => extractStoragePath(u as string))

        if (receiptPaths.length > 0) {
          await supabaseAdmin.storage.from('receipts').remove(receiptPaths)
          log['receipt_files'] = (log['receipt_files'] ?? 0) + receiptPaths.length
        }
      } catch { /* ignore */ }

      await safeDelete('expenses', { family_id: familyId, paid_by: user.id })
      await safeDelete('custody_exceptions', { family_id: familyId, proposed_by: user.id })
      await safeDelete('events', { family_id: familyId, created_by: user.id })
      await safeDelete('school_tasks', { family_id: familyId, created_by: user.id })
      await safeDelete('contacts', { family_id: familyId, created_by: user.id })

      // Handovers/settlements: try nulling references, ignore if NOT NULL constraint
      await safeUpdate('handovers', { from_parent: null }, { family_id: familyId, from_parent: user.id })
      await safeUpdate('handovers', { to_parent: null }, { family_id: familyId, to_parent: user.id })
      await safeUpdate('settlements', { settled_by: null }, { family_id: familyId, settled_by: user.id })

      // Remove membership
      await safeDelete('family_members', { family_id: familyId, user_id: user.id })

      // If nobody left in the family, delete the family (cascades children etc.)
      try {
        const { count: remainingMembers } = await supabaseAdmin
          .from('family_members')
          .select('id', { count: 'exact', head: true })
          .eq('family_id', familyId)

        if ((remainingMembers ?? 0) === 0) {
          await safeDelete('families', { id: familyId })
        }
      } catch { /* ignore */ }
    }

    // Profile avatar cleanup (best effort)
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single()

      if (profile?.avatar_url) {
        const path = extractStoragePath(profile.avatar_url)
        await supabaseAdmin.storage.from('avatars').remove([path])
      }
    } catch { /* ignore */ }

    // Remove profile
    await supabaseAdmin.from('profiles').delete().eq('id', user.id)

    // Finally delete the auth user
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (deleteAuthError) {
      console.error('Failed to delete auth user:', deleteAuthError)
      return new Response(JSON.stringify({ error: 'Failed to delete auth user', details: deleteAuthError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, ...log }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in delete_account:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

