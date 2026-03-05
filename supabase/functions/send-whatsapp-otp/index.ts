const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') || 'https://evoapi.autoflowai.io';
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') || '79F705602952-471C-8648-7F9D9BEE23D1';
const DEFAULT_INSTANCE = 'Blukastor_Nova';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { phone, otp, instanceName, companyName } = await req.json();

        // Always use the default instance (Blukastor_Nova) for sending OTPs
        const instance = DEFAULT_INSTANCE;

        console.log('Sending WhatsApp OTP:', { phone, instance, companyName });

        if (!phone || !otp) {
            return new Response(
                JSON.stringify({ error: 'Missing phone or otp' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Format phone for Evolution API (remove + prefix)
        const phoneNumber = phone.startsWith('+') ? phone.slice(1) : phone;

        const message = `🔐 *Código de verificación*\n\nTu código para acceder a *${companyName || 'la plataforma'}* es:\n\n*${otp}*\n\nEste código expira en 5 minutos.\nSi no solicitaste este código, ignora este mensaje.`;

        const url = `${EVOLUTION_API_URL}/message/sendText/${instance}`;
        console.log('Calling Evolution API:', url);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': EVOLUTION_API_KEY,
            },
            body: JSON.stringify({
                number: phoneNumber,
                text: message,
            }),
        });

        const data = await response.json();
        console.log('Evolution API response:', JSON.stringify(data));

        if (!response.ok) {
            console.error('Evolution API error:', data);
            return new Response(
                JSON.stringify({ error: 'Failed to send WhatsApp message', details: data }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ success: true, data }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error: any) {
        console.error('Error:', error.message);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
