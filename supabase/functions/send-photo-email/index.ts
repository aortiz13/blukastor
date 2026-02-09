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
        const { email, name, imageUrl, leadId } = await req.json()

        if (!email || !imageUrl) {
            throw new Error('Email and imageUrl are required')
        }

        // Initialize Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabase = createClient(supabaseUrl, supabaseKey)

        // Download the image from Supabase Storage
        const imagePath = imageUrl.split('/').pop() // Extract filename from URL
        const { data: imageData, error: downloadError } = await supabase
            .storage
            .from('generated')
            .download(imagePath)

        if (downloadError) {
            console.error('Download error:', downloadError)
            throw new Error(`Failed to download image: ${downloadError.message}`)
        }

        // Convert image to base64 for email attachment
        const arrayBuffer = await imageData.arrayBuffer()
        const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

        // Send email using Resend
        const resendApiKey = Deno.env.get('RESEND_API_KEY')
        if (!resendApiKey) {
            throw new Error('RESEND_API_KEY not configured')
        }

        const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'Smile Forward <noreply@dentalcorbella.com>',
                to: [email],
                subject: 'Tu Simulación Smile Forward está lista ✨',
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            body {
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                                line-height: 1.6;
                                color: #333;
                                max-width: 600px;
                                margin: 0 auto;
                                padding: 20px;
                            }
                            .header {
                                text-align: center;
                                padding: 30px 0;
                                border-bottom: 2px solid #f0f0f0;
                            }
                            .logo {
                                font-size: 28px;
                                font-weight: 300;
                                font-family: Georgia, serif;
                                color: #000;
                            }
                            .content {
                                padding: 40px 0;
                            }
                            h1 {
                                font-size: 24px;
                                font-weight: 600;
                                margin-bottom: 20px;
                                color: #000;
                            }
                            p {
                                margin-bottom: 15px;
                                color: #555;
                            }
                            .cta-button {
                                display: inline-block;
                                padding: 16px 32px;
                                background-color: #000;
                                color: #fff !important;
                                text-decoration: none;
                                border-radius: 50px;
                                font-weight: 500;
                                margin: 20px 0;
                            }
                            .footer {
                                text-align: center;
                                padding: 30px 0;
                                border-top: 2px solid #f0f0f0;
                                color: #999;
                                font-size: 14px;
                            }
                            .image-container {
                                text-align: center;
                                margin: 30px 0;
                            }
                            .image-container img {
                                max-width: 100%;
                                height: auto;
                                border-radius: 12px;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <div class="logo">Smile Forward</div>
                        </div>
                        
                        <div class="content">
                            <h1>¡Hola${name ? ` ${name}` : ''}! 👋</h1>
                            
                            <p>Tu simulación de sonrisa está lista. Adjuntamos tu imagen en alta calidad para que puedas verla con todo detalle.</p>
                            
                            <p>Esta es una <strong>simulación orientativa</strong> de cómo podría verse tu sonrisa después del tratamiento. El resultado final dependerá de tu caso clínico específico.</p>
                            
                            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
                                <p style="margin: 0; font-size: 16px; color: #000;">
                                    <strong>¿Quieres ver cómo te verías en movimiento?</strong>
                                </p>
                                <p style="margin: 10px 0 0 0; color: #666;">
                                    Una imagen da una idea, pero donde realmente se entiende el cambio es al verte hablar, reír y expresarte en situaciones reales con naturalidad.
                                </p>
                            </div>
                            
                            <div style="text-align: center;">
                                <a href="https://dentalcorbella.com/contacto/" class="cta-button">
                                    Reserva tu cita y vete en video
                                </a>
                            </div>
                            
                            <p style="margin-top: 30px; font-size: 14px; color: #999;">
                                Si tienes alguna pregunta, no dudes en contactarnos.
                            </p>
                        </div>
                        
                        <div class="footer">
                            <p>Dental Corbella - Smile Forward</p>
                            <p>Este correo fue enviado porque solicitaste una simulación de sonrisa en nuestro sitio web.</p>
                        </div>
                    </body>
                    </html>
                `,
                attachments: [
                    {
                        filename: 'smile-forward-simulation.jpg',
                        content: base64Image,
                    }
                ]
            })
        })

        if (!emailResponse.ok) {
            const errorText = await emailResponse.text()
            console.error('Resend API error:', errorText)
            throw new Error(`Failed to send email: ${errorText}`)
        }

        const emailResult = await emailResponse.json()
        console.log('Email sent successfully:', emailResult)

        return new Response(JSON.stringify({
            success: true,
            emailId: emailResult.id
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error('Edge Function Error:', error)
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
