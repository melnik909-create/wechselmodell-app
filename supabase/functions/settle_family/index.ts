import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SettleRequest {
  family_id: string
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
    const body: SettleRequest = await req.json()
    const { family_id } = body

    if (!family_id) {
      return new Response(JSON.stringify({ error: 'Missing family_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 4. Check family membership
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

    // 5. Fetch all expenses with receipt paths
    const { data: expenses, error: fetchError } = await supabaseAdmin
      .from('expenses')
      .select('id, receipt_url')
      .eq('family_id', family_id)

    if (fetchError) {
      console.error('Fetch expenses error:', fetchError)
      return new Response(JSON.stringify({ error: 'Failed to fetch expenses' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 6. Delete all receipt images from storage
    const deletedFiles: string[] = []
    const failedFiles: string[] = []

    if (expenses && expenses.length > 0) {
      for (const expense of expenses) {
        if (expense.receipt_url) {
          try {
            // Extract path from receipt_url (may be path or old public URL)
            let path = expense.receipt_url

            // If it's a full URL, extract the path
            if (path.includes('/storage/v1/object/')) {
              const parts = path.split('/storage/v1/object/')
              if (parts.length > 1) {
                const bucketAndPath = parts[1]
                const pathParts = bucketAndPath.split('/')
                pathParts.shift() // Remove bucket name
                path = pathParts.join('/')
              }
            }

            // Delete from receipts bucket
            const { error: deleteError } = await supabaseAdmin
              .storage
              .from('receipts')
              .remove([path])

            if (deleteError) {
              console.error(`Failed to delete receipt ${path}:`, deleteError)
              failedFiles.push(path)
            } else {
              deletedFiles.push(path)
            }
          } catch (error) {
            console.error(`Error processing receipt ${expense.receipt_url}:`, error)
            failedFiles.push(expense.receipt_url)
          }
        }
      }
    }

    // 7. Delete all expenses from database
    const { error: deleteExpensesError } = await supabaseAdmin
      .from('expenses')
      .delete()
      .eq('family_id', family_id)

    if (deleteExpensesError) {
      console.error('Delete expenses error:', deleteExpensesError)
      return new Response(JSON.stringify({ error: 'Failed to delete expenses' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 8. Reset settlement cycle (call RPC function)
    const { error: cycleError } = await supabaseAdmin.rpc('reset_settlement_cycle', {
      family_id_param: family_id
    })

    if (cycleError) {
      console.error('Reset settlement cycle error:', cycleError)
      // Continue anyway - not critical
    }

    // 9. Get other parent for notification
    const { data: members } = await supabaseAdmin
      .from('family_members')
      .select('user_id, profiles:profiles!family_members_user_id_fkey(display_name)')
      .eq('family_id', family_id)

    const otherParent = members?.find(m => m.user_id !== user.id)
    const currentUserProfile = members?.find(m => m.user_id === user.id)

    // 10. Return success response
    return new Response(JSON.stringify({
      success: true,
      deletedCount: expenses?.length ?? 0,
      deletedFiles: deletedFiles.length,
      failedFiles: failedFiles.length,
      otherParentId: otherParent?.user_id ?? null,
      currentUserName: currentUserProfile?.profiles?.display_name ?? 'Unbekannt'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in settle_family:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
