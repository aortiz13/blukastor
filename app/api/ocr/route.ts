import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const maxDuration = 60 // Allow up to 60s for OCR processing

const RECEIPT_EXTRACTION_PROMPT = `Eres un especialista en contabilidad. Analiza esta imagen de recibo, factura o comprobante de pago.

Extrae los siguientes datos y devuelve SOLO un JSON válido sin markdown:
{
  "amount": <número decimal del monto total/a pagar/neto — el valor más importante del documento>,
  "currency": "<código ISO de moneda detectada, ej: USD, MXN, ARS, COP, PEN, CLP, DOP — si no se detecta, usa USD>",
  "date": "<fecha en formato YYYY-MM-DD si se detecta, o null>",
  "vendor": "<nombre del comercio/proveedor/empresa que emite el recibo, o null>",
  "description": "<resumen breve de los items o concepto del recibo en máximo 100 caracteres>",
  "type": "<'expense' o 'income' según el tipo de documento>"
}

REGLAS IMPORTANTES:
- El "amount" debe ser el TOTAL FINAL a pagar. Busca etiquetas como: Total, Monto Total, A Pagar, Importe, Valor, Gran Total, Amount Due, Net, Neto, Cobro Total, Total a pagar.
- Si hay subtotal e IVA/impuestos, usa el TOTAL con impuestos incluidos.
- El amount debe ser un número decimal (ej: 1234.56), sin símbolos de moneda ni separadores de miles.
- Si no puedes determinar el monto con certeza, devuelve amount: 0.
- Solo devuelve el JSON, sin explicaciones ni markdown.`

export async function POST(request: NextRequest) {
    try {
        // 1. Auth check
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Get file and metadata from form data
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const companyId = formData.get('companyId') as string

        if (!file || !companyId) {
            return NextResponse.json({ error: 'File and companyId are required' }, { status: 400 })
        }

        // 3. Upload file to Supabase Storage
        const adminDb = createServiceClient()
        const storagePath = `${companyId}/${Date.now()}_${file.name}`

        const { data: uploadData, error: uploadError } = await adminDb.storage
            .from('receipts')
            .upload(storagePath, file, {
                contentType: file.type,
                upsert: false
            })

        if (uploadError) {
            console.error('Storage upload error:', uploadError)
            return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
        }

        // 4. Get public URL
        const { data: urlData } = adminDb.storage
            .from('receipts')
            .getPublicUrl(storagePath)

        const receiptUrl = urlData.publicUrl

        // 5. Extract receipt data with Gemini Vision
        let extractedData = null
        try {
            const apiKey = process.env.GEMINI_API_KEY
            if (apiKey) {
                const genAI = new GoogleGenerativeAI(apiKey)
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

                // Convert file to base64
                const arrayBuffer = await file.arrayBuffer()
                const base64Data = Buffer.from(arrayBuffer).toString('base64')

                // Determine MIME type for Gemini
                let mimeType = file.type
                if (mimeType === 'application/pdf') {
                    // Gemini can handle PDFs directly
                    mimeType = 'application/pdf'
                }

                console.log('[OCR] Sending to Gemini Vision...', { mimeType, fileSize: file.size })

                const result = await model.generateContent([
                    RECEIPT_EXTRACTION_PROMPT,
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: mimeType,
                        }
                    }
                ])

                const response = await result.response
                const text = response.text()
                console.log('[OCR] Gemini raw response:', text)

                // Parse JSON from response (handle possible markdown wrapping)
                const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim()
                const parsed = JSON.parse(cleanedText)

                extractedData = {
                    amount: typeof parsed.amount === 'number' ? parsed.amount : parseFloat(parsed.amount) || 0,
                    currency: parsed.currency || 'USD',
                    date: parsed.date || null,
                    vendor: parsed.vendor || null,
                    description: parsed.description || null,
                    type: parsed.type === 'income' ? 'income' : 'expense',
                }

                console.log('[OCR] Gemini extracted data:', extractedData)
            } else {
                console.warn('[OCR] GEMINI_API_KEY not set, skipping AI extraction')
            }
        } catch (geminiError) {
            console.error('[OCR] Gemini extraction error:', geminiError)
            // Non-fatal: client will fall back to Tesseract
        }

        // 6. Return upload result + extracted data
        return NextResponse.json({
            receiptUrl,
            storagePath,
            fileName: file.name,
            fileType: file.type,
            extractedData, // null if Gemini failed, client falls back to Tesseract
        })

    } catch (error) {
        console.error('OCR route error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
