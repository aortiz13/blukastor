import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }


    try {
        const { image_path, image_base64, analysisAsync, prompt_options } = await req.json()
        if (!image_path && !image_base64) throw new Error('Image path or Base64 data is required')

        // Initialize Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabase = createClient(supabaseUrl, supabaseKey)

        let base64Image = image_base64;

        if (!base64Image && image_path) {
            // Download original image
            const { data: fileData, error: downloadError } = await supabase.storage.from('uploads').download(image_path)
            if (downloadError) throw new Error(`Download failed: ${downloadError.message}`)

            const arrayBuffer = await fileData.arrayBuffer()
            base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
        }

        // --- PROMPT ENGINEERING STRATEGY ---
        let finalPrompt = "";

        // 1. Check for Secure Analysis ID (Proposed Optimized Flow)
        if (prompt_options?.analysis_id) {
            console.log(`Fetching secure prompt from DB: ${prompt_options.analysis_id}`);

            const { data: analysisRecord, error: dbError } = await supabase
                .from('analysis_results')
                .select('result')
                .eq('id', prompt_options.analysis_id)
                .single();

            if (dbError || !analysisRecord) {
                throw new Error("Security Error: Invalid or expired Analysis ID.");
            }

            // Find the requested variation (e.g. "original_bg")
            // The client sends `variationPrompt` which currently might be just the 'Subject' string or the type.
            // We need to know WHICH variation type validation to pick.
            // Let's assume `prompt_options.variation_type` is passed, or we infer it.
            // If `variationPrompt` contains the type name (e.g. "original_bg")...
            // Or we check `prompt_options.type`.

            // Fallback: If the client passes the "Subject" text that matches one of the variations...
            // Ideally, client should send `type: 'original_bg'`.
            // Let's assume `prompt_options.type` exists (we will add it to client).
            // If not, default to 'original_bg'.
            const targetType = prompt_options.type || 'original_bg';

            const variation = analysisRecord.result.variations.find((v: any) => v.type === targetType);

            if (!variation) {
                console.warn(`Variation ${targetType} not found in analysis. Using first available.`); // Fallback
            }
            const promptData = variation ? variation.prompt_data : analysisRecord.result.variations[0].prompt_data;

            // --- CONSTRUCT FULL DEMO-QUALITY PROMPT ---
            // Combining all the rich instructions into one block.
            finalPrompt = `
                Perform a ${promptData.Composition} of ${promptData.Subject} ${promptData.Action} in a ${promptData.Location}.
                Style: ${promptData.Style}. 
                IMPORTANT EDITING INSTRUCTIONS: ${promptData.Editing_Instructions}
                ${promptData.Refining_Details || ''}
                ${promptData.Reference_Instructions || ''}
                
                TECHNICAL CONSTRAINTS:
                - Maintain the EXACT framing, zoom, angle, and background of the original image. 
                - Do NOT zoom in or out. Do NOT crop the head. 
                - The input image must be the reference for identity.
            `;

            console.log("--- SECURE GENERATE SMILE PROMPT ---");
            console.log(finalPrompt);
            console.log("------------------------------------");

        } else {
            // 2. Fallback to Old Insecure/Simple Flow (if no analysis_id provided)
            finalPrompt = `
              Subject: ${prompt_options?.variationPrompt || "Portrait of the user with a perfect, natural smile."}
              Important: Maintain the EXACT framing, zoom, angle, and background of the original image. Do NOT zoom in or out. Do NOT crop.
              Action: Smiling confidently with a perfect, natural smile.
              Style: Photorealistic, cinematic lighting, 8k resolution, dental aesthetic high quality.
              Editing Input: Replace only the teeth with high quality veneers, keeping the face structure, skin texture, and background exactly the same.
            `;
        }

        // Call Imaging API (Gemini/Imagen via Google AI Studio)
        const apiKey = Deno.env.get('GOOGLE_API_KEY')
        if (!apiKey) throw new Error("GOOGLE_API_KEY missing")

        // User requested "gemini-3-pro-image-preview" for smile design
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
        // NOTE: Keeping 2.0-flash for DESCRIPTION generation as 'generate-smile' currently generates text description of improvements,
        // or a mock image. If the INTENT is to generate an actual image via 3-pro, the endpoint/body would need to change to an image generation endpoint
        // which might not be fully supported via 'generateContent' for all models or requires 'imagen'.
        // However, to satisfy the user request "Use gemini-3-pro-image-preview for Smile Design", I will use it.
        // BUT, 3-pro-image-preview might NOT support text-to-text 'describe improvements'.
        // If this function is meant to generate the IMAGE, it should use the image generation prompt/response handling.
        // Current code mocks the return.

        // Let's stick to 2.0-Flash for the *text description* part if that is what this does.
        // BUT the user says "Para diseñar la sonrisa".
        // Use the model requested. If it fails, we fall back to mock.
        const modelEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`

        console.log("Calling Gemini API (Smile Gen) with endpoint:", modelEndpoint);

        const response = await fetch(modelEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: `Generate a photorealistic image based on: ${finalPrompt}` },
                        { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
                    ]
                }]
            })
        })

        console.log("Gemini Response Status:", response.status);

        if (!response.ok) {
            const err = await response.text();
            console.error("Gemini API Error Body:", err);
            throw new Error(`Gemini API Failed (${response.status}): ${err}`)
        }

        const result = await response.json();
        const candidates = result.candidates;

        let generatedBase64 = null;
        let mimeType = "image/jpeg";

        if (candidates && candidates[0]?.content?.parts) {
            for (const part of candidates[0].content.parts) {
                const inlineData = part.inline_data || part.inlineData;
                if (inlineData) {
                    generatedBase64 = inlineData.data;
                    mimeType = inlineData.mime_type || inlineData.mimeType || "image/jpeg";
                    break;
                }
            }
        }

        if (!generatedBase64) {
            console.error("No image in response:", JSON.stringify(result));
            throw new Error("AI did not return an image.");
        }

        // Upload to Supabase Storage
        const fileName = `smile_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const binaryString = atob(generatedBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Assuming 'generated' bucket exists and is public
        const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('generated')
            .upload(fileName, bytes, {
                contentType: mimeType,
                upsert: false
            });

        if (uploadError) {
            console.error("Upload failed:", uploadError);
            throw new Error(`Failed to upload generated image: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase
            .storage
            .from('generated')
            .getPublicUrl(fileName);

        return new Response(JSON.stringify({
            success: true,
            public_url: publicUrl
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error("Edge Function Error:", error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500, // Return 500 so client knows it failed
        })
    }
})
