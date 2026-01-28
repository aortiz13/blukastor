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
        // User-defined Structured Prompt for Veo
        const baseInstructions = `
        - Subject: "The person from the reference image, maintaining the EXACT same smile and dental geometry."
        - Composition: "9:16 Vertical Portrait. FIXED CAMERA. NO ROTATION."
        - Editing_Instructions: "Keep the teeth identical to the Reference Image."
        - Reference_Instructions: "Use the provided input image to lock the facial identity and the smile design."
        `;

        let scenarioDetails = "";
        if (ageRange === '18-30') {
            scenarioDetails = `- Location: "Vibrant green park. Natural daylight. Green background."\n- Action: "Laughing naturally and warmly. Gentle head tilting in joy."`;
        } else if (ageRange === '55+') {
            scenarioDetails = `- Location: "Warm family dining room. Indoor lighting."\n- Action: "Smiling and interacting. Continuous gentle movement."`;
        } else {
            scenarioDetails = `- Location: "Stylish urban rooftop terrace. City sunset background."\n- Action: "Holding a drink and chatting naturally. Continuous light activity."`;
        }

        const scenarioPrompt = `${baseInstructions}\n${scenarioDetails}\n- Style: "Cinematic, Photorealistic, 4k High Quality."\n- NOTE: The video must start INSTANTLY in the target location (${ageRange === '18-30' ? 'Park' : 'Room/Roof'}). Do NOT fade in from the input image background.`;

        const negativePrompt = "black background, dark background, studio background, black void, morphing face, changing teeth, closing mouth, distortion, cartoon, low quality, glitchy motion, talking, flashing lights, extra limbs, blurry face, flickering teeth, floating objects, static start, frozen face, pause before moving, camera rotation, spinning camera, zoom out, open mouth";

        // 4. Call Google Veo API
        const apiKey = Deno.env.get('GOOGLE_API_KEY')
        if (!apiKey) throw new Error("GOOGLE_API_KEY missing")

        // Endpoint for Veo 3.1
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-fast-generate-preview:predictLongRunning?key=${apiKey}`;

        // Clean path... (existing)
        let storagePath = generation.output_path;
        if (storagePath.startsWith('http')) {
            const urlObj = new URL(storagePath);
            const pathParts = urlObj.pathname.split('/generated/');
            if (pathParts.length > 1) {
                storagePath = decodeURIComponent(pathParts[1]);
            }
        }
        console.log(`Original path: ${generation.output_path}, Parsed storage path: ${storagePath}`);

        // Get Signed URL
        const { data: signedUrlData, error: signError } = await supabase
            .storage
            .from('generated')
            .createSignedUrl(storagePath, 60);

        if (signError || !signedUrlData) {
            console.error("Signed URL Error:", signError);
            throw new Error(`Failed to create signed URL`);
        }

        const imageUrl = signedUrlData.signedUrl;

        // Download image
        const imgResponse = await fetch(imageUrl);
        if (!imgResponse.ok) throw new Error("Failed to fetch source image");

        const imgBlob = await imgResponse.blob();
        const arrayBuffer = await imgBlob.arrayBuffer();
        const imgBase64 = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = imgBlob.type || 'image/jpeg';

        console.log(`Starting video generation for ${lead.name} (${ageRange})... Image Type: ${mimeType}`);

        // SKIP IMAGEN GENERATION (Not supported by available API models)
        // Proceeding directly to Veo with Enhanced Prompt

        const aiResponse = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                instances: [
                    {
                        prompt: scenarioPrompt,
                        image: {
                            bytesBase64Encoded: imgBase64, // Use the NEW scene image
                            mimeType: mimeType
                        }
                    }
                ],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: "9:16",
                    resolution: "1080p", // Keeping param
                    durationSeconds: 5,  // Keeping param
                    negativePrompt: negativePrompt
                }
            })
        });

        if (!aiResponse.ok) {
            const errText = await aiResponse.text();
            console.error("AI API Error:", errText);
            throw new Error(`AI API Error: ${errText}`);
        }

        const operation = await aiResponse.json();
        const operationName = operation.name; // ID to poll

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
