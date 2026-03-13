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
        const { phone, inviteUrl, companyName, role } = await req.json();

        const instance = DEFAULT_INSTANCE;

        console.log('Sending WhatsApp Invite:', { phone, instance, companyName, role });

        if (!phone || !inviteUrl) {
            return new Response(
                JSON.stringify({ error: 'Missing phone or inviteUrl' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Format phone for Evolution API (remove + prefix)
        const phoneNumber = phone.startsWith('+') ? phone.slice(1) : phone;

        // Build message based on role
        let roleText = 'miembro';
        if (role === 'admin') roleText = 'administrador';
        else if (role === 'client') roleText = 'usuario';

        const message = `🎉 *Invitación a ${companyName || 'la plataforma'}*\n\nHas sido invitado como *${roleText}*.\n\nHaz clic en el siguiente enlace para completar tu registro:\n\n${inviteUrl}\n\n📝 Se te pedirá crear tu correo y contraseña.\n\n⏰ Este enlace expira en 7 días.\nSi no esperabas esta invitación, ignora este mensaje.`;

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
                JSON.stringify({ error: 'Failed to send WhatsApp invite', details: data }),
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
