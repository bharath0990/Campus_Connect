// Supabase Edge Function: CampusStay API Operations (TypeScript Deno standard)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname.split('/').pop()

    // 1. Initialise Supabase Client from inside the cluster environment
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Authenticate client
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized Access' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const requestBody = await req.json().catch(() => ({}))

    // Route 1: Roommate Matching Vector Compatibility
    if (path === 'match-roommates') {
      // Fetch target preferences
      const { data: targetUser } = await supabaseClient
        .from('users')
        .select('preferences')
        .eq('id', user.id)
        .single()

      const tPref = targetUser?.preferences || {}

      // Query other students
      const { data: students } = await supabaseClient
        .from('users')
        .select('id, name, email, profile_pic, trust_score, preferences')
        .eq('role', 'student')
        .neq('id', user.id)
        .limit(20)

      const matches = (students || []).map((oStudent) => {
        const oPref = oStudent.preferences || {}
        let score = 0;
        let breakdown = [];

        // Budget Match (30 pts)
        const targetAvgBudget = ((tPref.budgetMin || 0) + (tPref.budgetMax || 15000)) / 2
        const otherAvgBudget = ((oPref.budgetMin || 0) + (oPref.budgetMax || 15000)) / 2
        const budgetDiff = Math.abs(targetAvgBudget - otherAvgBudget)
        const budgetScore = Math.max(0, 30 - (budgetDiff / 500))
        score += budgetScore
        breakdown.push({ criteria: 'Budget Match', score: Math.round(budgetScore) })

        // Sleep habit Match (25 pts)
        let sleepScore = 5;
        if (tPref.sleepHabit === oPref.sleepHabit) {
          sleepScore = 25
        } else if (tPref.sleepHabit === 'flexible' || oPref.sleepHabit === 'flexible') {
          sleepScore = 15
        }
        score += sleepScore
        breakdown.push({ criteria: 'Sleep Schedule', score: sleepScore })

        // Cleanliness Match (25 pts)
        const cleanScore = (tPref.cleanliness === oPref.cleanliness) ? 25 : 12
        score += cleanScore
        breakdown.push({ criteria: 'Cleanliness Habit', score: cleanScore })

        // Social Match (20 pts)
        const socialScore = (tPref.socialStatus === oPref.socialStatus) ? 20 : 10
        score += socialScore
        breakdown.push({ criteria: 'Social Compatibility', score: socialScore })

        return {
          uid: oStudent.id,
          name: oStudent.name,
          email: oStudent.email,
          profilePic: oStudent.profile_pic,
          trustScore: oStudent.trust_score,
          matchPercentage: Math.round(score),
          breakdown
        }
      }).sort((a, b) => b.matchPercentage - a.matchPercentage)

      return new Response(JSON.stringify({ matches }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Route 2: Pricing Intelligence Suggestion Engine
    if (path === 'suggest-optimal-price') {
      const { city, currentPrice, amenities = [] } = requestBody
      if (!city) {
        return new Response(JSON.stringify({ error: 'City argument is required' }), { status: 400 })
      }

      // Fetch room records in city
      const { data: cityRooms } = await supabaseClient
        .from('rooms')
        .select('rent')
        .eq('city', city)

      let total = 0
      let count = 0
      if (cityRooms && cityRooms.length > 0) {
        cityRooms.forEach((r) => {
          total += r.rent
          count++
        })
      }

      const averagePrice = count > 0 ? (total / count) : 6800
      let optimalPrice = averagePrice * (1 + Math.min(0.25, amenities.length * 0.05))

      let status = 'Optimal'
      let difference = 0
      if (currentPrice) {
        difference = ((currentPrice - optimalPrice) / optimalPrice) * 100
        status = difference > 10 ? 'High' : (difference < -10 ? 'Competitive' : 'Optimal')
      }

      return new Response(JSON.stringify({
        averageMarketPrice: Math.round(averagePrice),
        suggestedOptimalPrice: Math.round(optimalPrice),
        pricingStatus: status,
        priceDifferencePercent: Math.round(difference),
        tips: [
          'High WiFi speed listings report 35% higher booking success rates.',
          'AC is high in demand in this zone. Keep rates competitive to reduce vacancies.',
        ]
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Default route placeholder
    return new Response(JSON.stringify({ error: 'Method mapping not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
