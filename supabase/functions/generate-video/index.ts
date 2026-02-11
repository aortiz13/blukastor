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
        const { lead_id, scenario_id } = await req.json()
        if (!lead_id) throw new Error('Lead ID is required')

        // Initialize Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabase = createClient(supabaseUrl, supabaseKey)
        const apiKey = Deno.env.get('GOOGLE_API_KEY')
        if (!apiKey) throw new Error("GOOGLE_API_KEY missing")

        // 1. Fetch Lead Survey Data
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('survey_data, name')
            .eq('id', lead_id)
            .single()

        if (leadError || !lead) throw new Error('Lead not found')
        const surveyData = lead.survey_data || {}
        const ageRange = surveyData.ageRange || '30-55'

        // 2. Determine Scenario Details
        let scenarioDetails = "";
        let sceneDescription = "";
        let finalScenario = scenario_id || "automatic";

        const scenarios: Record<string, { description: string, details: string }> = {
            park: {
                description: "Professional outdoor portrait in a vibrant green park with natural daylight.",
                details: "- Location: \"Vibrant green park. Natural daylight. Green background.\"\n- Action: \"Laughing naturally and warmly. Gentle head tilting in joy.\""
            },
            home: {
                description: "Warm, cozy portrait in a family dining room with indoor lighting.",
                details: "- Location: \"Warm family dining room. Indoor lighting.\"\n- Action: \"Smiling warmly or laughing gently. Continuous gentle movement.\""
            },
            office: {
                description: "Professional office environment with bright corporative lighting.",
                details: "- Location: \"Modern professional office. Bright windows. Corporate setting.\"\n- Action: \"Smiling professionally and confidently. Natural business interaction vibe.\""
            },
            dinner: {
                description: "Stylish portrait during a social dinner at a high-end restaurant with ambient lighting.",
                details: "- Location: \"Elegant restaurant. Warm ambient lighting. Blurred social background.\"\n- Action: \"Holding a toast glass and laughing joyfully. High-end social aesthetic.\""
            },
            beach: {
                description: "Sunny portrait on a beautiful beach during vacation with golden-hour lighting.",
                details: "- Location: \"Tropical beach. Ocean background. Golden hour sun.\"\n- Action: \"Smiling happily and relaxed. Vacation vibe. Wind gently in hair.\""
            }
        };

        if (scenarios[scenario_id]) {
            sceneDescription = scenarios[scenario_id].description;
            scenarioDetails = scenarios[scenario_id].details;
        } else {
            // Fallback to age-based logic if scenario_id is missing or 'automatic'
            if (ageRange === '18-30') {
                sceneDescription = scenarios.park.description;
                scenarioDetails = scenarios.park.details;
                finalScenario = "automatic_park";
            } else if (ageRange === '55+') {
                sceneDescription = scenarios.home.description;
                scenarioDetails = scenarios.home.details;
                finalScenario = "automatic_home";
            } else {
                // Rooftop for 30-55
                sceneDescription = "Stylish portrait on an urban rooftop terrace with a city sunset background.";
                scenarioDetails = "- Location: \"Stylish urban rooftop terrace. City sunset background.\"\n- Action: \"Holding a drink and laughing or smiling naturally. High-end social aesthetic.\"";
                finalScenario = "automatic_rooftop";
            }
        }


        // 3. Fetch Smile Image Generation (SOURCE)
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

        // Clean path and get Signed URL for Source Image
        let storagePath = generation.output_path;
        if (storagePath.startsWith('http')) {
            const urlObj = new URL(storagePath);
            const pathParts = urlObj.pathname.split('/generated/');
            if (pathParts.length > 1) {
                storagePath = decodeURIComponent(pathParts[1]);
            }
        }

        const { data: signedUrlData, error: signError } = await supabase
            .storage
            .from('generated')
            .createSignedUrl(storagePath, 60);

        if (signError || !signedUrlData) throw new Error("Failed to create signed URL");

        const imgResponse = await fetch(signedUrlData.signedUrl);
        if (!imgResponse.ok) throw new Error("Failed to fetch source image");
        const imgBlob = await imgResponse.blob();
        const arrayBuffer = await imgBlob.arrayBuffer();
        const imgBase64 = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = imgBlob.type || 'image/jpeg';


        // STEP 1: GENERATE SCENE IMAGE (Image-to-Image)
        console.log("Generating SCENE IMAGE for " + lead.name + " (Scenario: " + finalScenario + ")...");

        // Default to original image if generation fails
        let sceneImgBase64 = imgBase64;
        let sceneImgMimeType = mimeType;
        let generatedScenePath = generation.output_path;

        const sceneGenerationPrompt = "Subject: The person in the input image.\nAction: " + (ageRange === '18-30' ? 'Laughing naturally' : ageRange === '55+' ? 'Smiling warmly' : 'Smiling casually') + ".\nLocation: " + sceneDescription + "\nStyle: Photorealistic, cinematic lighting, 8k resolution, High Quality.\nEditing Input: Change the background to match the Location description. Keep the person's face, hair, and smile EXACTLY the same. Seamlessly blend the lighting.";

        // EXACT PATTERN FROM generate-smile
        const visionEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=" + apiKey;

        try {
            const sceneResponse = await fetch(visionEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: "Generate a photorealistic image based on: " + sceneGenerationPrompt },
                            { inline_data: { mime_type: mimeType, data: imgBase64 } }
                        ]
                    }]
                })
            });

            if (!sceneResponse.ok) {
                const errText = await sceneResponse.text();
                console.warn("Scene Generation API Failed:", errText);
            } else {
                const result = await sceneResponse.json();
                const candidates = result.candidates;

                let foundBase64 = null;
                let foundMime = null;

                if (candidates && candidates[0]?.content?.parts) {
                    for (const part of candidates[0].content.parts) {
                        const inlineData = part.inline_data || part.inlineData;
                        if (inlineData) {
                            foundBase64 = inlineData.data;
                            foundMime = inlineData.mime_type || inlineData.mimeType || "image/jpeg";
                            break;
                        }
                    }
                }

                if (foundBase64) {
                    console.log("New Scene Image Generated Successfully.");
                    sceneImgBase64 = foundBase64;
                    sceneImgMimeType = foundMime;

                    const sceneFileName = lead_id + "_scene_" + ageRange + "_" + Date.now() + ".png";
                    const sceneBuffer = Buffer.from(sceneImgBase64, 'base64');

                    const { data: uploadData, error: uploadError } = await supabase
                        .storage
                        .from('generated')
                        .upload(lead_id + "/" + sceneFileName, sceneBuffer, {
                            contentType: sceneImgMimeType,
                            upsert: true
                        });

                    if (!uploadError && uploadData) {
                        generatedScenePath = uploadData.path;
                        console.log("Scene Image uploaded to: " + generatedScenePath);
                    }
                } else {
                    console.warn("Gemini successful but NO IMAGE found in response Parts.");
                }
            }
        } catch (err) {
            console.error("Error in Scene Generation:", err);
        }


        // STEP 2: GENERATE VIDEO (Veo)
        console.log("Starting VEO Generation with Scene Image...");

        const baseInstructions = "- Subject: \"The person from the input image.\"\n- Composition: \"9:16 Vertical Portrait. FIXED CAMERA. NO ROTATION.\"\n- IMPORTANT: \"The subject has a warm, natural expression that evolves gently. The smile should look organic, with natural movements of the lips and cheeks. The subject can transition from a gentle closed-mouth smile to a joyful open-mouth smile. ABSOLUTELY NO SPEECH or talking. The mouth must NOT move to form words, mumble, or lip-sync. Movement must be purely expressive and organic, maintaining identical dental structure and facial identity throughout.\"";

        const scenarioPrompt = baseInstructions + "\n" + scenarioDetails + "\n- Style: \"Cinematic, Photorealistic, 4k High Quality.\"\n- NOTE: The video must start INSTANTLY in the target location. Do NOT fade in from the input image background.";

        console.log("--- SECURE GENERATE VIDEO PROMPT ---");
        console.log(scenarioPrompt);
        console.log("------------------------------------");

        const negativePrompt = "talking, speech, lip syncing, articulating words, conversing, dialog, whispering, chewing, mumbling, aggressive jaw movement, speaking, uttering, morphing teeth, morphing face, distortion, glitchy dental structure, low quality, flashing pixels, jerky head movement";

        const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-fast-generate-preview:predictLongRunning?key=" + apiKey;

        const aiResponse = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                instances: [
                    {
                        prompt: scenarioPrompt,
                        image: {
                            bytesBase64Encoded: sceneImgBase64,
                            mimeType: sceneImgMimeType
                        }
                    }
                ],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: "9:16",
                    resolution: "1080p",
                    durationSeconds: 8,
                    negativePrompt: negativePrompt
                }
            })
        });

        if (!aiResponse.ok) {
            const errText = await aiResponse.text();
            console.error("AI API Error:", errText);
            throw new Error("AI API Error: " + errText);
        }

        const operation = await aiResponse.json();
        const operationName = operation.name;

        // 5. Create Generation Record
        const { data: newGen, error: insertError } = await supabase
            .from('generations')
            .insert({
                lead_id: lead_id,
                type: 'video',
                status: 'processing',
                input_path: generatedScenePath,
                metadata: {
                    operation_name: operationName,
                    scenario: finalScenario,
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
