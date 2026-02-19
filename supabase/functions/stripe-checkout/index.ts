import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

interface CheckoutRequest {
  plan_type: 'lifetime' | 'cloud_plus_monthly' | 'cloud_plus_yearly'
  success_url?: string
  cancel_url?: string
  mode?: 'web' | 'native'
}

const PLAN_CONFIG = {
  lifetime: {
    name: 'WechselPlaner Core (Lifetime)',
    amount: 1499,
    recurring: false,
  },
  cloud_plus_monthly: {
    name: 'Cloud Plus (Monatlich)',
    amount: 199,
    recurring: true,
    interval: 'month' as const,
  },
  cloud_plus_yearly: {
    name: 'Cloud Plus (Jährlich)',
    amount: 1999,
    recurring: true,
    interval: 'year' as const,
  },
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify user auth
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

    // 2. Parse request
    const body: CheckoutRequest = await req.json()
    const { plan_type, success_url, cancel_url, mode = 'web' } = body

    const plan = PLAN_CONFIG[plan_type]
    if (!plan) {
      return new Response(JSON.stringify({ error: 'Invalid plan type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. For native: create PaymentIntent
    if (mode === 'native') {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: plan.amount,
        currency: 'eur',
        metadata: { user_id: user.id, plan_type },
        receipt_email: user.email ?? undefined,
      })

      return new Response(
        JSON.stringify({
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. For web: create Checkout Session
    const lineItems = plan.recurring
      ? [{
          price_data: {
            currency: 'eur',
            product_data: { name: plan.name },
            unit_amount: plan.amount,
            recurring: { interval: plan.interval! },
          },
          quantity: 1,
        }]
      : [{
          price_data: {
            currency: 'eur',
            product_data: { name: plan.name },
            unit_amount: plan.amount,
          },
          quantity: 1,
        }]

    const origin = req.headers.get('origin') || 'https://wechselplaner.vercel.app'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: plan.recurring ? 'subscription' : 'payment',
      success_url: success_url || `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&plan=${plan_type}`,
      cancel_url: cancel_url || `${origin}/payment-cancel`,
      customer_email: user.email ?? undefined,
      metadata: { user_id: user.id, plan_type },
    })

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Stripe checkout error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
