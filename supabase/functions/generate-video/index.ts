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

        // 2. Fetch Smile Image Generation (SOURCE)
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

        if (signError || !signedUrlData) throw new Error(`Failed to create signed URL`);

        const imgResponse = await fetch(signedUrlData.signedUrl);
        if (!imgResponse.ok) throw new Error("Failed to fetch source image");
        const imgBlob = await imgResponse.blob();
        const arrayBuffer = await imgBlob.arrayBuffer();
        const imgBase64 = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = imgBlob.type || 'image/jpeg';


        // 3. DETERMINE SCENARIO (Moved up)
        let scenarioDetails = "";
        let sceneDescription = "";
        if (ageRange === '18-30') {
            sceneDescription = "Professional outdoor portrait in a vibrant green park with natural daylight.";
            scenarioDetails = `- Location: "Vibrant green park. Natural daylight. Green background."\n- Action: "Laughing naturally and warmly. Gentle head tilting in joy."`;
        } else if (ageRange === '55+') {
            sceneDescription = "Warm, cozy portrait in a family dining room with indoor lighting.";
            scenarioDetails = `- Location: "Warm family dining room. Indoor lighting."\n- Action: "Smiling warmly or laughing gently. Continuous gentle movement."`;
        } else {
            sceneDescription = "Stylish portrait on an urban rooftop terrace with a city sunset background.";
            scenarioDetails = `- Location: "Stylish urban rooftop terrace. City sunset background."\n- Action: "Holding a drink and laughing or smiling naturally. High-end social aesthetic."`;
        }


        // STEP 1: GENERATE SCENE IMAGE (Image-to-Image)
        console.log(`Generating SCENE IMAGE for ${lead.name} (${ageRange})...`);

        // Default to original image if generation fails
        let sceneImgBase64 = imgBase64;
        let sceneImgMimeType = mimeType;
        let generatedScenePath = generation.output_path;

        const sceneGenerationPrompt = `
      Subject: The person in the input image.
      Action: ${ageRange === '18-30' ? 'Laughing naturally' : ageRange === '55+' ? 'Smiling warmly' : 'Smiling casually'}.
      Location: ${sceneDescription}
      Style: Photorealistic, cinematic lighting, 8k resolution, High Quality.
      Editing Input: Change the background to match the Location description. Keep the person's face, hair, and smile EXACTLY the same. Seamlessly blend the lighting.
    `;

        // EXACT PATTERN FROM generate-smile
        const visionEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`;

        try {
            const sceneResponse = await fetch(visionEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: `Generate a photorealistic image based on: ${sceneGenerationPrompt}` },
                            { inline_data: { mime_type: mimeType, data: imgBase64 } }
                        ]
                    }]
                })
            });

            if (!sceneResponse.ok) {
                const errText = await sceneResponse.text();
                console.warn("Scene Generation API Failed:", errText);
                // We don't throw here to allow fallback to original image
            } else {
                const result = await sceneResponse.json();
                const candidates = result.candidates;

                let foundBase64 = null;
                let foundMime = null;

                if (candidates && candidates[0]?.content?.parts) {
                    for (const part of candidates[0].content.parts) {
                        // Check for inline_data (snake_case) or inlineData (camelCase)
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

                    // Upload this new "Scene Image" to Storage
                    const sceneFileName = `${lead_id}_scene_${ageRange}_${Date.now()}.png`;
                    const sceneBuffer = Buffer.from(sceneImgBase64, 'base64');

                    const { data: uploadData, error: uploadError } = await supabase
                        .storage
                        .from('generated')
                        .upload(`${lead_id}/${sceneFileName}`, sceneBuffer, {
                            contentType: sceneImgMimeType,
                            upsert: true
                        });

                    if (!uploadError && uploadData) {
                        generatedScenePath = uploadData.path;
                        console.log(`Scene Image uploaded to: ${generatedScenePath}`);
                    }
                } else {
                    console.warn("Gemini successful but NO IMAGE found in response Parts.");
                    console.log("Response dump:", JSON.stringify(result));
                }
            }
        } catch (err) {
            console.error("Error in Scene Generation:", err);
        }


        // STEP 2: GENERATE VIDEO (Veo)
        console.log("Starting VEO Generation with Scene Image...");

        const baseInstructions = `
        - Subject: "The person from the input image."
        - Composition: "9:16 Vertical Portrait. FIXED CAMERA. NO ROTATION."
        - IMPORTANT: "The subject is smiling or laughing. The smile must be prominent and STABLE. The subject must NOT move their lips to form words or speak. Maintain identical dental structure."
        `;

        const scenarioPrompt = `${baseInstructions}\n${scenarioDetails}\n- Style: "Cinematic, Photorealistic, 4k High Quality."\n- NOTE: The video must start INSTANTLY in the target location (${ageRange === '18-30' ? 'Park' : 'Room/Roof'}). Do NOT fade in from the input image background.`;
        const negativePrompt = "talking, speech, mouth moving to speak, articulating words, conversation, morphing face, changing teeth, closing mouth, distortion, cartoon, low quality, glitchy motion, flashing lights, extra limbs, blurry face, flickering teeth, floating objects, static start, frozen face, camera rotation, spinning camera, zoom out";

        // Endpoint for Veo 3.1
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-fast-generate-preview:predictLongRunning?key=${apiKey}`;

        const aiResponse = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                instances: [
                    {
                        prompt: scenarioPrompt,
                        image: {
                            bytesBase64Encoded: sceneImgBase64, // using the SCENE image (or original if failed)
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
            throw new Error(`AI API Error: ${errText}`);
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
                input_path: generatedScenePath, // Points to the Scene Image used
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
