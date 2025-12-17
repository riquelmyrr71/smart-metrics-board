import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CREATORS_DATA_ID = '00000000-0000-0000-0000-000000000004'

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current data to preserve team structure
    const { data: currentData, error: fetchError } = await supabase
      .from('dashboard_data')
      .select('data')
      .eq('id', CREATORS_DATA_ID)
      .maybeSingle()

    if (fetchError) {
      throw fetchError
    }

    const parsed = currentData?.data as { teamStructure?: any } | null
    const teamStructure = parsed?.teamStructure || []

    // Reset creators data but keep team structure
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('dashboard_data')
      .upsert({
        id: CREATORS_DATA_ID,
        data: {
          creatorsData: {},
          creatorsTodayData: {},
          teamStructure,
          lastUpdated: now,
        },
        updated_at: now,
      })

    if (updateError) {
      throw updateError
    }

    console.log('Creators analysis data reset successfully at', now)

    return new Response(
      JSON.stringify({ success: true, message: 'Creators analysis data reset', timestamp: now }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error resetting creators analysis:', error)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

