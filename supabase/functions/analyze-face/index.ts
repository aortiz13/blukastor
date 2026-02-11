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
        try {
            const { image_path, image_base64, mode = 'analyze' } = await req.json()

            if (!image_path && !image_base64) {
                throw new Error('Image path or Base64 data is required')
            }

            // Initialize Supabase Client
            const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
            const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            const supabase = createClient(supabaseUrl, supabaseKey)

            let base64Image = image_base64;

            // If no base64 provided, download from Storage
            if (!base64Image && image_path) {
                const { data: fileData, error: downloadError } = await supabase
                    .storage
                    .from('uploads') // Assuming 'uploads' bucket
                    .download(image_path)

                if (downloadError) {
                    throw new Error(`Failed to download image: ${downloadError.message}`)
                }
                // Convert to Base64
                const arrayBuffer = await fileData.arrayBuffer()
                base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
            }

            // Prepare Gemini Request
            const apiKey = Deno.env.get('GOOGLE_API_KEY')
            if (!apiKey) {
                throw new Error("GOOGLE_API_KEY is not configured")
            }

            // Use Gemini 1.5 Flash for speed and analysis (Stable)
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`

            let prompt = "";

            if (mode === 'validate') {
                prompt = `
            You are a Strict Biometric Validator for a dental AI app. Analyze the image and determine if it is suitable for clinical smile design.
            
            THE RULES (Rejection Criteria):
            1. Non-Human: Reject cars, animals, cartoons, landscapes, objects. MUST BE A REAL HUMAN.
            2. No Face: Reject if face is not clearly visible or too far away.
            3. Obstruction: Reject if mouth is covered (hands, mask, phone).
            4. Angle: Reject extreme profiles.
            5. Quality: Reject if too dark, too blurry, or pixelated.

            OUTPUT REQUIREMENT:
            Return ONLY a JSON object.
            {
              "is_valid": boolean,
              "rejection_reason": "string (Max 6 words, in Spanish)"
            }
          `;
            } else {
                // "analyze" mode - Needs to return the Restoration Plan with Variations
                prompt = `
            ROLE: Expert Dental Morphologist and AI Prompt Engineer. 
            TASK: Analyze the user's face using specific landmarks: Eyes, Nose, and Hairline. Generate a restoration plan that harmonizes with these features.
            
            SCIENTIFIC ANALYSIS PARAMETERS (Clinical Landmarks & Rules):
            1. The Interpupillary Rule (Eyes): Detect the user's eyes. The line connecting the center of the eyes (interpupillary line) must be the horizon for the smile. The "Incisal Plane" must be perfectly parallel to this eye line.
            2. The Nasal Width Guide (Nose): Use the width of the base of the nose (alar base) to determine the position of the Canines. 
            3. Facial Midline: Strictly align the Dental Midline (between two front teeth) with the Philtrum and Tip of the Nose.
            4. Facial Frame Balance (Hair/Brows): Analyze the visual weight of the "Upper Facial Third" (Hair volume and Brow thickness). If the subject has a heavy upper frame, slighty increase the dominance/size of the Central Incisors to maintain vertical balance.
            5. Golden Proportion (1.618): Central width should be ~1.618x the visible width of Lateral Incisor.
        
            WORKFLOW STRATEGY: 
            1. The first variation (original_bg) is the CLINICAL RESTORATION. It serves as the SOURCE OF TRUTH.
            - You must map the scientific analysis above into the editing instructions.
            - CRITICAL FRAMING: The output must be a 9:16 Vertical Portrait showing the FULL FACE.
            2. The other 2 variations MUST use the result of step 1 as a Reference Image for consistency.

            OUTPUT FORMAT: Strictly JSON.
            Structure:
            {
                "variations": [
                    { 
                        "type": "original_bg" | "lifestyle_social" | "lifestyle_outdoor",
                        "prompt_data": { 
                            "Subject": string, 
                            "Composition": string, 
                            "Action": string, 
                            "Location": string, 
                            "Style": string, 
                            "Editing_Instructions": string, 
                            "Refining_Details": string, 
                            "Reference_Instructions": string 
                        } 
                    }
                ]
            }

            REQUIRED VARIATIONS & GUIDELINES:

            1. original_bg (Scientific Natural Restoration):
            - Subject: "A photorealistic portrait of the user EXACTLY as seen in the input image. Maintain the EXACT framing, zoom level, camera angle, and background."
            - Composition: "Identical to the input image. Do NOT change the zoom, crop, or aspect ratio. Ensure the Before and After images align perfectly."
            - Action: "The subject is smiling naturally, with a dentition aligned to their interpupillary horizon."
            - Location: "The original background from the input image. Do not change it."
            - Style: "High-End Aesthetic Dentistry Photography, 8K resolution, Photorealistic."
            - Editing_Instructions: "APPLY CLINICAL LANDMARKS: \n1. HORIZON: Align the Incisal Plane to be strictly parallel with the Interpupillary Line (Eyes).\n2. MIDLINE & WIDTH: Align the dental midline with the Philtrum/Nose Tip. Use the alar base width (nose width) to guide the cusp tip position of the Canines.\n3. VERTICAL BALANCE: Assess the visual weight of the Hair and Eyebrows. If the upper face is dominant, increase the length of Central Incisors slightly to balance the face.\n4. PROPORTIONS: Enforce the esthetic dental proportion of 1.6:1:0.6 (Central:Lateral:Canine)."
            - Refining_Details: "Texture must be polychromatic natural ivory with realistic translucency at incisal edges. Ensure the smile arc follows the lower lip."
            - Reference_Instructions: "Use the user's original photo strictly for Facial Identity, Skin Tone, and Lip Shape. Completely replace the dental structure using the landmarks defined above."

            2. lifestyle_social:
            - Subject: "The person from the reference image, maintaining the EXACT same smile and dental geometry."
            - Composition: "9:16 Vertical Portrait."
            - Action: "Laughing candidly at a gala or high-end dinner."
            - Style: "Warm, social lifestyle photography, depth of field."
            - Location: "Luxury restaurant or event space."
            - Editing_Instructions: "Place subject in a social context. Keep the teeth identical to the Reference Image."
            - Reference_Instructions: "Use the 'Natural Restoration' image to lock the facial identity and the smile design."

            3. lifestyle_outdoor:
            - Subject: "The person from the reference image, maintaining the EXACT same smile and dental geometry."
            - Composition: "9:16 Vertical Portrait."
            - Action: "Walking confidently, wind in hair."
            - Style: "Cinematic outdoor lighting, vogue aesthetic."
            - Location: "Urban architecture or nature at golden hour."
            - Editing_Instructions: "Golden hour lighting. Keep the teeth identical to the Reference Image."
            - Reference_Instructions: "Use the 'Natural Restoration' image to lock the facial identity and the smile design."
            `;
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
                        ]
                    }],
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                })
            })

            if (!response.ok) {
                const errText = await response.text()
                throw new Error(`Gemini API Error: ${errText}`)
            }

            const result = await response.json()
            const analysisText = result.candidates?.[0]?.content?.parts?.[0]?.text;

            // Ensure we handle cases where text might be missing or malformed
            if (!analysisText) {
                throw new Error("Empty response from AI")
            }

            // Parse the JSON to save it structured
            let analysisJson;
            try {
                // Remove markdown code blocks if present
                const cleanText = analysisText.replace(/```json/g, '').replace(/```/g, '').trim();
                analysisJson = JSON.parse(cleanText);
            } catch (e) {
                console.error("Failed to parse Gemini response as JSON:", analysisText);
                // Fallback: Save as raw text wrapped in object if parsing fails, but for this specific flow we expect JSON.
                // If it fails, we might just return the text as before, but we can't save it effectively or secure it.
                // We'll throw because the app expects JSON.
                throw new Error("Invalid JSON from AI Analysis");
            }

            // --- SAVE TO DB (Server-Side Caching) ---
            const { data: insertedData, error: dbError } = await supabase
                .from('analysis_results')
                .insert({
                    result: analysisJson,
                    // If we had a lead_id, we would save it here. For now it's anonymous/session-based until lead is created?
                    // The prompt doesn't send lead_id yet. It's fine for now.
                })
                .select('id')
                .single();

            if (dbError) {
                console.error("Failed to save analysis to DB:", dbError);
                // We can continue but we won't have an ID. 
                // However, the security requirement implies we MUST rely on the ID.
                throw new Error("Database Error: Failed to secure analysis session.");
            }

            const analysisId = insertedData.id;

            // --- SANITIZE RESPONSE ---
            // Create a safe version for the client (Removing the "Secret Sauce" prompts)
            const safeAnalysis = {
                analysis_id: analysisId, // Client needs this for the next step
                variations: analysisJson.variations.map((v: any) => ({
                    type: v.type,
                    // We keep the descriptive fields for the UI (if used) but REMOVE the instructions
                    prompt_data: {
                        Subject: v.prompt_data.Subject, // Maybe keep Subject if needed for UI title? Or remove if too revealing?
                        // "Subject" in the prompt is actually the full image description. It might contain "scientific aligned smile...".
                        // User wanted to hide "instructions". 
                        // Let's hide everything except what's needed for the UI cards.
                        // Does the UI display these text fields?
                        // Looking at the code, WidgetContainer might use them.
                        // Checking types... usually UI just shows "Natural", "Social", "Outdoor".
                        // Let's assume we only need the keys or simple labels.
                        // But to be safe, let's include non-instruction fields if they exist, or just null them.

                        // Masking critical proprietary instructions:
                        Editing_Instructions: null,
                        Refining_Details: null,
                        Reference_Instructions: null,

                        // Keep benign fields if used by UI for preview text
                        Style: v.prompt_data.Style,
                        Location: v.prompt_data.Location
                    }
                }))
            };

            return new Response(JSON.stringify(safeAnalysis), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }
    })
