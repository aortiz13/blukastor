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
                // "analyze" mode - Needs to return the Restoration Plan with Variations
                prompt = `
            ROLE: Expert Dental Morphologist, Prosthodontist, and AI Prompt Engineer.
            TASK: Perform a comprehensive facial and dental analysis to design a clinically accurate smile restoration.
            
            SCIENTIFIC ANALYSIS PARAMETERS (The "Secret Sauce"):

            1.  **Facial Phenotype & VITA Shade Mapping:**
                - Analyze the user's skin tone (Fitzpatrick Scale) and undertone (Warm/Cool).
                - **RULE:** Assign a VITA Shade that complements the skin tone to look natural, NOT fake white.
                - *Mapping:* 
                    - Dark/Warm Skin -> VITA A2 or A3 (Warm/Natural). AVERAGE VALUE.
                    - Light/Cool Skin -> VITA A1 or B2 (Natural Brightness).
                    - Olive/Neutral -> VITA A2.
                - **CRITICAL:** Do NOT select OM1, OM2, or OM3 unless the user looks like a celebrity model. Favor NATURAL DENTIN tones.
                - Output the selected shade in the response.

            2.  **Dental Proportions (Golden Proportion & W/L Ratio):**
                - **Central Incisors:** Must have a Width-to-Length ratio of **75-80%**. They are the dominant key of the smile.
                - **Golden Progression (RED Proportion):** The visible width of the Lateral Incisor must be **62% (0.618)** of the Central Incisor. The Canine must be **62%** of the Lateral.
                - **Axis:** The long axis of the teeth must incline slightly distally toward the apical.

            3.  **Gingival Architecture (Pink Esthetics):**
                - **Zenith Points:** The highest point of the gingival margin (Zenith) for Centrals and Canines should be at the same height. The Lateral Incisor zenith should be 0.5mm-1mm *lower* (more coronal).
                - **Texture:** Render healthy, stippled (orange-peel) pink gingiva. No inflammation.
                - **Papillae:** Pointed and filling the interdental embrasures (no black triangles).

            4.  **Smile Arc & Consonance (The "Youthful" Curve):**
                - **CRITICAL RULE:** The curve formed by the incisal edges of the maxillary teeth MUST be convex and strictly **parallel** to the superior border of the lower lip.
                - **Buccal Corridors:** Ensure triangular dark spaces at the corners of the mouth are present but minimal (broad arch, but physically realistic).

            5.  **Facial Integration:**
                - **Midline:** Align dental midline to the facial midline (Philtrum).
                - **Interpupillary Line:** The incisal plane must be parallel to the eyes.

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
                            "Reference_Instructions": string,
                            "Clinical_Justification": string // NEW: Explain why this shade/shape was chosen
                        } 
                    }
                ]
            }

            REQUIRED VARIATIONS & GUIDELINES:

            1. original_bg (Scientific Natural Restoration):
            - Subject: "A photorealistic clinical portrait of the user with a biologically integrated smile restoration."
            - Composition: "Identical to the input image. MAIN FOCUS: The DSmile."
            - Action: "Smiling naturally with a Consonant Smile Arc following the lower lip."
            - Location: "Original background."
            - Style: "Macro Dental Photography, 8K, Twin-Flash Lighting."
            - Editing_Instructions: "Replace existing dentition. \n1. VITA SHADE: [Insert Selected Shade] with gradation (darker cervical, lighter incisal). \n2. TEXTURE: Mamelons and perikymata MUST be visible. \n3. FORM: Apply 80% W/L ratio to Centrals. \n4. GINGIVA: High-scalloped, stippled pink gingiva."
            - Refining_Details: "CRITICAL: The teeth must NOT look like white plastic. They must have TRANSPARENCY at the edges (blue/gray halo). Add surface irregularities and light reflection."
            - Reference_Instructions: "Maintain facial identity strictly. Only upgrade the smile."
            - Clinical_Justification: "Selected biologically appropriate VITA [Shade] to contrast with [SkinTone] and avoid the 'fake veneer' look."

            2. lifestyle_social:
            - Subject: "The user in a high-end social context."
            - Action: "Laughing candidly."
            - Style: "Candid Event Photography, Flash."
            - Editing_Instructions: "Same dental anatomy as variation 1, but exposed in a dynamic laugh."
            
            3. lifestyle_outdoor:
            - Subject: "The user in natural lighting."
            - Action: "Confident smile."
            - Style: "Golden Hour Portrait."
            - Editing_Instructions: "Same dental anatomy, natural light reflection on enamel."
            `;
            }

            console.log("Calling Gemini API with endpoint:", endpoint);
            // console.log("Payload sent:", JSON.stringify(body, null, 2)); // Uncomment for full payload debug if needed

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

            console.log("Gemini Response Status:", response.status);

            if (!response.ok) {
                const errText = await response.text()
                console.error("Gemini API Error Body:", errText);
                throw new Error(`Gemini API Error (${response.status}): ${errText}`)
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
