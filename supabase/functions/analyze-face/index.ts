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

            // Use Gemini 2.0 Flash for speed and analysis
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`

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
            - Subject: "A photorealistic vertical medium shot of the user, featuring a scientifically aligned smile restoration based on facial morphopsychology."
            - Composition: "9:16 Vertical Portrait (Stories Format). Medium Shot. Full head and shoulders visible."
            - Action: "The subject is smiling naturally, with a dentition aligned to their interpupillary horizon."
            - Location: "Soft-focus professional studio or original background."
            - Style: "High-End Aesthetic Dentistry Photography, 8K resolution."
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

            return new Response(analysisText, {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }
    })
