import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Buffer } from 'node:buffer'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders, status: 200 })
    }

    try {
        const { lead_id } = await req.json()
        if (!lead_id) throw new Error('Lead ID is required')

        // Initialize Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. Fetch Lead Survey Data
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('survey_data, name')
            .eq('id', lead_id)
            .single()

        if (leadError || !lead) throw new Error('Lead not found')
        const surveyData = lead.survey_data || {}
        const ageRange = surveyData.ageRange || '30-55'

        // 2. Fetch Smile Image Generation
        const { data: generation, error: genError } = await supabase
            .from('generations')
            .select('output_path')
            .eq('lead_id', lead_id)
            .eq('type', 'image')
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (genError || !generation) throw new Error('No smile image found for this lead')

        // 3. Prepare Prompts based on Scenarios
        // 3. Prepare Prompts based on Scenarios
        let scenarioPrompt = "";
        const baseScene = "The subject is INSTANTLY in the target environment. The background IS NOT black; it is the target scene from the very first frame. FIXED CAMERA, NO ZOOM, NO ROTATION. The subject faces forward. Lips sealed, gentle smile. Cinematic vertical video. High quality, photorealistic, 4k. Background sound: emotive music.";

        if (ageRange === '18-30') {
            scenarioPrompt = `The subject is already laughing manually and warmly in a vibrant green park. Green background. Natural daylight. Gentle head tilting in joy, but camera stays fixed. ${baseScene}`;
        } else if (ageRange === '55+') {
            scenarioPrompt = `The subject is already smiling at a warm family celebration. Warm indoor lighting. Background of a dining room. Continuous gentle movement. ${baseScene}`;
        } else {
            // Default 30-55 or others
            scenarioPrompt = `The subject is already on a stylish urban rooftop terrace. City sunset background. They are holding a drink. Continuous light activity. ${baseScene}`;
        }

        const negativePrompt = "black background, dark background, studio background, black void, morphing face, changing teeth, closing mouth, distortion, cartoon, low quality, glitchy motion, talking, flashing lights, extra limbs, blurry face, flickering teeth, floating objects, static start, frozen face, pause before moving, camera rotation, spinning camera, zoom out, open mouth";
        // ... (lines 62-139 unchanged) ...
        // 5. Initial Generation Record (Pending)
        const { data: newGen, error: insertError } = await supabase
            .from('generations')
            .insert({
                lead_id: lead_id,
                type: 'video',
                status: 'processing',
                input_path: generation.output_path,
                metadata: {
                    operation_name: operationName,
                    scenario: ageRange,
                    prompt: scenarioPrompt,
                    negative_prompt: negativePrompt
                }
            })

            .select()
            .single()

        if (insertError) throw insertError

        return new Response(JSON.stringify({
            success: true,
            generation_id: newGen.id,
            operation_name: operationName
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
