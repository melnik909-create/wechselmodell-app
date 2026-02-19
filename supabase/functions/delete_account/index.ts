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

    let deletedReceiptFiles = 0
    let deletedExpenses = 0
    let deletedEvents = 0
    let deletedExceptions = 0
    let deletedSchoolTasks = 0
    let removedMemberships = 0
    let deletedFamilies = 0

    for (const familyId of familyIds) {
      // Expenses + receipts in storage
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
        const { error: removeError } = await supabaseAdmin.storage.from('receipts').remove(receiptPaths)
        if (!removeError) deletedReceiptFiles += receiptPaths.length
      }

      const { count: expensesCount } = await supabaseAdmin
        .from('expenses')
        .delete({ count: 'exact' })
        .eq('family_id', familyId)
        .eq('paid_by', user.id)
      deletedExpenses += expensesCount ?? 0

      // Custody exceptions proposed by user
      const { count: exceptionsCount } = await supabaseAdmin
        .from('custody_exceptions')
        .delete({ count: 'exact' })
        .eq('family_id', familyId)
        .eq('proposed_by', user.id)
      deletedExceptions += exceptionsCount ?? 0

      // Events created by user (optional table)
      if ((await supabaseAdmin.from('events').select('id', { head: true, count: 'exact' }).limit(1)).error === null) {
        const { count: eventsCount } = await supabaseAdmin
          .from('events')
          .delete({ count: 'exact' })
          .eq('family_id', familyId)
          .eq('created_by', user.id)
        deletedEvents += eventsCount ?? 0
      }

      // School tasks created by user (optional table)
      if ((await supabaseAdmin.from('school_tasks').select('id', { head: true, count: 'exact' }).limit(1)).error === null) {
        const { count: tasksCount } = await supabaseAdmin
          .from('school_tasks')
          .delete({ count: 'exact' })
          .eq('family_id', familyId)
          .eq('created_by', user.id)
        deletedSchoolTasks += tasksCount ?? 0
      }

      // Handovers: keep history for the other parent, but remove references to this user
      await supabaseAdmin.from('handovers').update({ from_parent: null }).eq('family_id', familyId).eq('from_parent', user.id)
      await supabaseAdmin.from('handovers').update({ to_parent: null }).eq('family_id', familyId).eq('to_parent', user.id)

      // Settlements: keep history, remove reference
      await supabaseAdmin.from('settlements').update({ settled_by: null }).eq('family_id', familyId).eq('settled_by', user.id)

      // Remove membership
      const { count: memCount } = await supabaseAdmin
        .from('family_members')
        .delete({ count: 'exact' })
        .eq('family_id', familyId)
        .eq('user_id', user.id)
      removedMemberships += memCount ?? 0

      // If nobody left in the family, delete the family (cascades children etc.)
      const { count: remainingMembers } = await supabaseAdmin
        .from('family_members')
        .select('id', { count: 'exact', head: true })
        .eq('family_id', familyId)

      if ((remainingMembers ?? 0) === 0) {
        const { count: famDelCount } = await supabaseAdmin
          .from('families')
          .delete({ count: 'exact' })
          .eq('id', familyId)
        deletedFamilies += famDelCount ?? 0
      }
    }

    // Profile avatar cleanup (best effort)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single()

    if (profile?.avatar_url) {
      try {
        const path = extractStoragePath(profile.avatar_url)
        await supabaseAdmin.storage.from('avatars').remove([path])
      } catch {
        // ignore
      }
    }

    // Remove profile
    await supabaseAdmin.from('profiles').delete().eq('id', user.id)

    // Finally delete the auth user
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (deleteAuthError) {
      return new Response(JSON.stringify({ error: 'Failed to delete auth user' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      success: true,
      deletedReceiptFiles,
      deletedExpenses,
      deletedEvents,
      deletedExceptions,
      deletedSchoolTasks,
      removedMemberships,
      deletedFamilies,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('Error in delete_account:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

