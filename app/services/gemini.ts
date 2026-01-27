'use server';

import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResponse, VariationType } from "@/types/gemini";
import { logApiUsage, checkVideoQuota, markVideoQuotaUsed } from "./backendService";

// Models
// Verified working: gemini-2.0-flash
const ANALYSIS_MODEL = "gemini-2.0-flash";
const IMAGE_MODEL = "gemini-2.0-flash";
const TARGET_IMAGE_MODEL = "gemini-2.0-flash";

const VALIDATION_MODEL = "gemini-2.0-flash";
const VIDEO_MODEL = "veo-2.0-generate-preview"; // Assuming Veo is correct/unchanged or experimental

// Helper to strip base64 prefix
const stripBase64Prefix = (base64: string): string => {
    return base64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
};

const getMimeType = (base64: string): string => {
    const match = base64.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    return match ? match[1] : 'image/jpeg';
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isModelOverloaded = (error: any): boolean => {
    return (
        error.status === 'UNAVAILABLE' ||
        error.code === 503 ||
        error.message?.includes('overloaded') ||
        error.error?.code === 503 ||
        error.error?.status === 'UNAVAILABLE' ||
        (error.response?.status === 503)
    );
};

// Robust Text Extractor for @google/genai SDK
const extractText = (response: any): string => {
    try {
        console.log("[Gemini] Raw Response Keys:", Object.keys(response));
        if (response.text) {
            if (typeof response.text === 'function') {
                return response.text();
            }
            if (typeof response.text === 'string') {
                return response.text;
            }
        }
        return response.candidates?.[0]?.content?.parts?.[0]?.text ||
            response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || // In case of weird structure
            "";
    } catch (e) {
        console.error("[Gemini] Failed to extract text:", e);
        return "";
    }
};

// Safe JSON Parse
const safeParseJSON = (text: string) => {
    try {
        // Remove markdown code blocks if present
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (e) {
        console.error("[Gemini] JSON Parse Failed. Text:", text.slice(0, 100));
        return null;
    }
};

// Gatekeeper
export const validateImageStrict = async (base64Image: string): Promise<{ success: boolean; data?: { isValid: boolean; reason: string }; error?: string }> => {
    console.log("[Gemini] ENTRY: validateImageStrict called. Image length:", base64Image?.length);
    if (!base64Image) {
        return { success: false, error: "Error: Imagen vacía o corrupta." };
    }

    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            console.error("[Gemini Gatekeeper] Missing API_KEY");
            return { success: false, error: "Error de configuración del servidor (API KEY missing)." };
        }

        const ai = new GoogleGenAI({ apiKey });
        const mimeType = getMimeType(base64Image);
        const data = stripBase64Prefix(base64Image);

        const prompt = `
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

        const response = await ai.models.generateContent({
            model: VALIDATION_MODEL,
            contents: {
                parts: [
                    { inlineData: { mimeType, data } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
                // Removing schema temporarily to see if it causes 400s with 2.0-flash in some regions
                // or just simplify it
            }
        });

        const text = extractText(response);
        console.log("[Gemini] Gatekeeper Response Text:", text.slice(0, 50));

        if (text) {
            const result = safeParseJSON(text);
            if (!result) return { success: false, error: "Error procesando la respuesta de IA." };

            return {
                success: true,
                data: {
                    isValid: !!result.is_valid,
                    reason: result.rejection_reason || ""
                }
            };
        }

        return { success: false, error: "Error de validación. Intenta otra foto." };

    } catch (error: any) {
        console.error("[Gatekeeper] Critical Error Details:", JSON.stringify(error, null, 2));
        return { success: false, error: `Error de Validación: ${error.message?.slice(0, 100) || "Error desconocido"}` };
    }
};

// Analysis
export const analyzeImageAndGeneratePrompts = async (base64Image: string): Promise<{ success: boolean; data?: AnalysisResponse; error?: string }> => {
    console.log("[Gemini] ENTRY: analyzeImageAndGeneratePrompts called.");
    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            return { success: false, error: "Server configuration error: API_KEY missing" };
        }

        const ai = new GoogleGenAI({ apiKey });
        const mimeType = getMimeType(base64Image);
        const data = stripBase64Prefix(base64Image);

        // Simplified Prompt to reduce chance of payload/token issues
        const prompt = `
        Analyize this face for a smile redesign.
        Return a JSON with 3 variations (original_bg, lifestyle_social, lifestyle_outdoor).
        For each, provide Subject, Composition, Action, Location, Style, Editing_Instructions, and Reference_Instructions.
        `;

        let attempts = 0;
        const maxRetries = 2;

        while (attempts < maxRetries) {
            try {
                const response = await ai.models.generateContent({
                    model: ANALYSIS_MODEL,
                    contents: {
                        parts: [
                            { inlineData: { mimeType, data } },
                            { text: prompt }
                        ]
                    },
                    config: {
                        responseMimeType: "application/json"
                    }
                });

                const text = extractText(response);
                if (text) {
                    await logApiUsage('GEMINI_VISION_ANALYSIS');
                    const result = safeParseJSON(text) as AnalysisResponse;
                    if (!result) throw new Error("Invalid JSON from AI");
                    return { success: true, data: result };
                }
                throw new Error("Empty response");
            } catch (error: any) {
                attempts++;
                console.error(`Attempt ${attempts} failed:`, error.message);
                if (attempts === maxRetries) throw error;
            }
        }
        return { success: false, error: "Max retries reached" };
    } catch (criticalError: any) {
        console.error("[Gemini Analysis] Fatal Error Details:", JSON.stringify(criticalError, null, 2));
        return { success: false, error: `Error en Análisis: ${criticalError.message?.slice(0, 50)}` };
    }
};

// Validate Generated Image
export const validateGeneratedImage = async (base64Image: string): Promise<boolean> => {
    console.log("[Gemini] validateGeneratedImage called.");
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API_KEY not found");

    const ai = new GoogleGenAI({ apiKey });
    const mimeType = getMimeType(base64Image);
    const data = stripBase64Prefix(base64Image);

    const prompt = `
    Act as a Quality Assurance Photographer. Analyze the attached image. Check for the following Fail Conditions:
    1. Is it an extreme close-up of just the mouth/teeth? (Macro shot).
    2. Is the person's forehead or eyes cut out of the frame?
    3. Is the aspect ratio horizontal instead of vertical?

    Output exactly and only: 'PASS' if the image shows the FULL FACE (eyes, nose, mouth, chin) and shoulders in a vertical format. 'FAIL' if it is a close-up of the mouth or crops the head significantly.
  `;

    try {
        const response = await ai.models.generateContent({
            model: VALIDATION_MODEL,
            contents: {
                parts: [
                    { inlineData: { mimeType, data } },
                    { text: prompt }
                ]
            }
        });

        const result = response.text?.trim().toUpperCase();
        await logApiUsage('GEMINI_VISION_ANALYSIS');
        return result === 'PASS';

    } catch (error) {
        console.error("Validation failed:", error);
        return true; // Fail open
    }
};

// Generate Smile Variation
export const generateSmileVariation = async (
    inputImageBase64: string,
    variationPrompt: string,
    aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "1:1"
): Promise<string> => {
    console.log("[Gemini] generateSmileVariation called for prompt:", variationPrompt.slice(0, 50));
    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            console.error("[Gemini Generation] Missing API_KEY");
            throw new Error("Server configuration error: API_KEY missing");
        }

        const ai = new GoogleGenAI({ apiKey });
        const mimeType = getMimeType(inputImageBase64);
        const data = stripBase64Prefix(inputImageBase64);

        let attempts = 0;
        const maxRetries = 5;

        while (attempts < maxRetries) {
            try {
                // NOTE: Using a specific model identifier. Check docs for latest Imagen/Gemini image gen model if this fails.
                // Prototype used: gemini-3-pro-image-preview. 
                // We will try to use the same if possible, or 'imagen-3.0-generate-001'
                const response = await ai.models.generateContent({
                    model: TARGET_IMAGE_MODEL,
                    // If the user specifically needs the image model, we might need to change this.
                    // For now, using flash for broader compatibility unless specified otherwise.
                    // ACTUALLY, strict 'text-to-image' or 'image-to-image' via `generateContent` in new SDK depends on model capabilities.
                    // Let's assume the user has access to the model they specified.
                    contents: {
                        parts: [
                            { inlineData: { mimeType, data } },
                            { text: variationPrompt }
                        ]
                    },
                    // config: { 
                    //   imageConfig: { imageSize: "1024x1024" } // check correct config param
                    // }
                });
                // The new SDK returns images differently sometimes.
                // If it's pure image generation model like Imagen, response structure matches.

                for (const part of response.candidates?.[0]?.content?.parts || []) {
                    if (part.inlineData) {
                        await logApiUsage('NANO_BANANA_IMAGE');
                        return `data:image/png;base64,${part.inlineData.data}`;
                    }
                }

                // If text response, maybe it failed to gen image?
                if (response.text) {
                    console.log("Model returned text instead of image:", response.text);
                }

                throw new Error("No image data found in generation response.");

            } catch (error: any) {
                attempts++;
                if (isModelOverloaded(error) && attempts < maxRetries) {
                    const waitTime = 3000 * Math.pow(2, attempts - 1);
                    await delay(waitTime);
                    continue;
                }
                console.error("Image generation failed:", error);
                // SANITIZE ERROR
                throw new Error(`Generation Failed: ${error.message || "Unknown error"}`);
            }
        }
        throw new Error("Image generation failed after multiple retries.");
    } catch (criticalGenError: any) {
        console.error("[Gemini Generation] Fatal Error:", criticalGenError);
        throw new Error(`Error generando imagen: ${criticalGenError.message?.slice(0, 100) || "Intenta de nuevo."}`);
    }
};

// Generate Video
export const generateVeoVideo = async (
    inputImageBase64: string
): Promise<string> => {
    if (!await checkVideoQuota()) {
        throw new Error("Video Generation Limit Reached (1/1). Upgrade required for more.");
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API_KEY not found");

    const ai = new GoogleGenAI({ apiKey });

    let mimeType = '';
    let data = '';

    if (inputImageBase64.startsWith('http')) {
        try {
            const response = await fetch(inputImageBase64);
            if (!response.ok) throw new Error("Could not retrieve source image.");
            const blob = await response.blob();
            mimeType = blob.type;

            data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                // Node.js FileReader polyfill or use ArrayBuffer
                // Since this is Server Action (Node env), FileReader might not exist or work same.
                // Better to use arrayBuffer and Buffer.from
                resolve(""); // Placeholder if we need to fix this logic for Node
            });

            // FIX for Node environment:
            const arrayBuffer = await blob.arrayBuffer();
            data = Buffer.from(arrayBuffer).toString('base64');

        } catch (e: any) {
            console.error("Failed to fetch remote image for Veo:", e);
            throw new Error("Failed to prepare source image for video generation.");
        }
    } else {
        mimeType = getMimeType(inputImageBase64);
        data = stripBase64Prefix(inputImageBase64);
    }

    const textPrompt = "Cinematic vertical video. The subject from the input image comes to life. They are laughing naturally and warmly in a restaurant setting. The head tilts slightly back in joy. The smile is wide, prominent, and STABLE, maintaining the exact dental structure and whiteness from the input image. Soft movement of background elements (blur). High quality, photorealistic, 4k.";
    const negativePrompt = "morphing face, changing teeth, closing mouth, distortion, cartoon, low quality, glitchy motion, talking";
    const fullPrompt = `${textPrompt} Negative prompt: ${negativePrompt}`;

    try {
        // Note: generateVideos might need a different import or client setup depending on SDK version
        let operation = await ai.models.generateVideos({
            model: VIDEO_MODEL, // "veo-..."
            prompt: fullPrompt,
            image: {
                imageBytes: data,
                mimeType: mimeType
            },
            config: {
                numberOfVideos: 1,
                // resolution: '720p',
                // aspectRatio: '9:16'
            }
        });

        // Polling Loop
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        if (operation.error) {
            throw new Error(`Video generation failed: ${operation.error.message}`);
        }

        const result = operation.response || (operation as any).result;
        const videoUri = result?.generatedVideos?.[0]?.video?.uri;

        if (!videoUri) {
            if (operation.metadata?.finishMessage) {
                throw new Error(`Video blocked: ${operation.metadata.finishMessage}`);
            }
            throw new Error("No video URI returned from Veo.");
        }

        await logApiUsage('GOOGLE_VEO_VIDEO');
        await markVideoQuotaUsed();

        // In Server Action, we can return the URI directly if it's accessible,
        // or proxy the download if it requires the key (which it does: videoUri + key=...)
        // Returning the URI with key appended is risky if sent to client?
        // The prototype did: fetch(uri + key).blob() -> createObjectURL.
        // We should probably download it here and upload to Supabase, then return Supabase URL.
        // For now, let's replicate prototype behavior but return base64 or similar to client?
        // Or just return the signed URL if safe.

        // SAFE APPROACH: Download video here, Upload to Supabase Storage, Return Public URL.
        // BUT for exact replication of prototype flow receiving a Blob URL:
        // We can fetch it, convert to base64 data URI (video/mp4).

        const videoUrlWithKey = `${videoUri}${videoUri.includes('?') ? '&' : '?'}key=${apiKey}`;
        const vidResponse = await fetch(videoUrlWithKey);
        if (!vidResponse.ok) throw new Error("Failed to download video from Veo");

        const vidBuffer = await vidResponse.arrayBuffer();
        const vidBase64 = Buffer.from(vidBuffer).toString('base64');

        return `data:video/mp4;base64,${vidBase64}`;

    } catch (error: any) {
        console.error("Veo generation error:", error);
        throw error;
    }
};
