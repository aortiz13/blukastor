const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') || 'https://evoapi.autoflowai.io';
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') || '79F705602952-471C-8648-7F9D9BEE23D1';
const DEFAULT_INSTANCE = 'Blukastor_Nova';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function buildMessage(companyName: string, roleText: string, inviteUrl: string, language: string): string {
    if (language === 'en') {
        return `🎉 *Invitation to ${companyName || 'the platform'}*\n\nYou have been invited as *${roleText}*.\n\nClick the following link to complete your registration:\n\n${inviteUrl}\n\n📝 You will be asked to create your email and password.\n\n⏰ This link expires in 7 days.\nIf you were not expecting this invitation, please ignore this message.`;
    }
    // Default: Spanish
    return `🎉 *Invitación a ${companyName || 'la plataforma'}*\n\nHas sido invitado como *${roleText}*.\n\nHaz clic en el siguiente enlace para completar tu registro:\n\n${inviteUrl}\n\n📝 Se te pedirá crear tu correo y contraseña.\n\n⏰ Este enlace expira en 7 días.\nSi no esperabas esta invitación, ignora este mensaje.`;
}

function getRoleText(role: string, language: string): string {
    if (language === 'en') {
        if (role === 'admin') return 'administrator';
        if (role === 'client') return 'user';
        return 'member';
    }
    // Default: Spanish
    if (role === 'admin') return 'administrador';
    if (role === 'client') return 'usuario';
    return 'miembro';
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { phone, inviteUrl, companyName, role, language } = await req.json();

        const instance = DEFAULT_INSTANCE;
        const lang = ['es', 'en'].includes(language) ? language : 'es';

        console.log('Sending WhatsApp Invite:', { phone, instance, companyName, role, language: lang });

        if (!phone || !inviteUrl) {
            return new Response(
                JSON.stringify({ error: 'Missing phone or inviteUrl' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Format phone for Evolution API (remove + prefix)
        const phoneNumber = phone.startsWith('+') ? phone.slice(1) : phone;

        const roleText = getRoleText(role, lang);
        const message = buildMessage(companyName, roleText, inviteUrl, lang);

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
