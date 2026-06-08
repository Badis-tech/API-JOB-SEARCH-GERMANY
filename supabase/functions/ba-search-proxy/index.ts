import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allows your GitHub Pages domain to make requests
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests smoothly
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Parse incoming parameters passed from the GitHub Pages frontend
    const url = new URL(req.url)
    const was = url.searchParams.get('was') || 'Pflege'
    const wo = url.searchParams.get('wo') || ''
    const umkreis = url.searchParams.get('umkreis') || '25'
    const page = url.searchParams.get('page') || '1'
    const size = url.searchParams.get('size') || '10'

    // 2. Map standard parameters to the official BA API format
    const baParams = new URLSearchParams({
      angebotsart: '4', // Apprenticeships
      was,
      wo,
      umkreis,
      page,
      size
    })

    const targetUrl = `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs?${baParams.toString()}`

    // 3. Dispatch secure outbound fetch call
    const baResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'X-API-Key': 'jobboerse-jobsuche',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!baResponse.ok) {
      throw new Error(`BA Origin Interface Barrier: Status ${baResponse.status}`)
    }

    const data = await baResponse.json()

    // 4. Return clean payload directly to the client wrapper
    return new Response(
      JSON.stringify({
        totalResults: data.maxErgebnisse || 0,
        jobs: data.stellenangebote || []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})