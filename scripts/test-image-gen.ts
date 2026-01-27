
import { GoogleGenAI } from "@google/genai";
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Manual config since it's a script
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.production' });
dotenv.config({ path: '.env' });

const apiKey = process.env.API_KEY;

if (!apiKey) {
    console.error("❌ Missing API_KEY");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// Helper to save base64
const saveImage = (base64: string, filename: string) => {
    const data = base64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(filename, buffer);
    console.log(`✅ Image saved to ${filename}`);
};

const testModel = async (modelName: string, method: 'generateContent' | 'generateImages' | 'editImage') => {
    console.log(`\n🧪 Testing Model: ${modelName} | Method: ${method}`);
    try {
        if (method === 'generateContent') {
            const response = await ai.models.generateContent({
                model: modelName,
                contents: {
                    parts: [{ text: "Generate a photorealistic image of a futuristic dental clinic with blue lighting." }]
                }
            });
            console.log("Response Type:", typeof response);
            // Check for image parts
            const parts = response.candidates?.[0]?.content?.parts || [];
            let foundImage = false;
            for (const part of parts) {
                if (part.inlineData) {
                    console.log("🎉 Found Image Data!");
                    saveImage(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`, `test_${modelName}_${method}.png`);
                    foundImage = true;
                }
            }
            if (!foundImage) console.log("ℹ️ No image data found in response. Text:", response.text ? response.text.slice(0, 100) : "No text");

        } else if (method === 'generateImages') {
            const response = await ai.models.generateImages({
                model: modelName,
                prompt: "A beautiful smile design digital art.",
                config: { numberOfImages: 1 }
            });
            const img = response.generatedImages?.[0]?.image;
            if (img && img.imageBytes) {
                console.log("🎉 Found Image Data!");
                saveImage(`data:${img.mimeType || 'image/png'};base64,${img.imageBytes}`, `test_${modelName}_${method}.png`);
            } else {
                console.error("❌ No generated image returned.");
            }

        } else if (method === 'editImage') {
            // Create a dummy starting black image for reference if needed, or skip if we don't have one handy.
            // For this test, we might skip unless we download one.
            console.log("⚠️ EditImage test requiring reference skipped for simple test. Focusing on generation capabilities.");
        }

    } catch (error: any) {
        console.error(`❌ FAILED: ${error.message}`);
        // console.error(JSON.stringify(error, null, 2));
    }
};

(async () => {
    // 1. User requested model
    await testModel("gemini-3-pro-image-preview", "generateContent");
    await testModel("gemini-3-pro-image-preview", "generateImages");

    // 2. Fallbacks/Alternatives
    await testModel("imagen-3.0-generate-001", "generateImages");
    await testModel("gemini-2.0-flash", "generateContent");
})();
