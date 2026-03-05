import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: Request) {
    try {
        const supabase = await createServiceClient()
        const { phone, companyId } = await request.json()

        if (!phone || !companyId) {
            return NextResponse.json(
                { error: 'Teléfono y empresa son requeridos' },
                { status: 400 }
            )
        }

        // Normalize phone (ensure + prefix)
        const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`

        // 1. Check if this phone exists in wa.contacts for this company
        const { data: contact, error: contactError } = await supabase
            .schema('wa')
            .from('contacts')
            .select('id, phone, push_name, user_id, client_company_id')
            .eq('phone', normalizedPhone)
            .eq('client_company_id', companyId)
            .limit(1)
            .single()

        if (contactError || !contact) {
            return NextResponse.json(
                { error: 'Este número de teléfono no está registrado en esta empresa' },
                { status: 404 }
            )
        }

        // 2. Get company info and WhatsApp instance
        const { data: instance } = await supabase
            .schema('wa')
            .from('wa_instances')
            .select('instance_name, client_company_id')
            .eq('client_company_id', companyId)
            .limit(1)
            .single()

        if (!instance) {
            return NextResponse.json(
                { error: 'No se encontró una instancia de WhatsApp para esta empresa' },
                { status: 404 }
            )
        }

        // Get company name
        const { data: company } = await supabase
            .from('client_companies')
            .select('name')
            .eq('id', companyId)
            .single()

        // 3. Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString()

        // 4. Invalidate any previous OTPs for this phone+company
        await supabase
            .schema('wa')
            .from('phone_otps')
            .update({ used: true })
            .eq('phone', normalizedPhone)
            .eq('company_id', companyId)
            .eq('used', false)

        // 5. Store OTP in database
        const { error: otpError } = await supabase
            .schema('wa')
            .from('phone_otps')
            .insert({
                phone: normalizedPhone,
                otp_code: otp,
                company_id: companyId,
            })

        if (otpError) {
            console.error('Error storing OTP:', otpError)
            return NextResponse.json(
                { error: 'Error al generar código de verificación' },
                { status: 500 }
            )
        }

        // 6. Send OTP via WhatsApp (Edge Function → Evolution API)
        const { error: sendError } = await supabase.functions.invoke('send-whatsapp-otp', {
            body: {
                phone: normalizedPhone,
                otp,
                instanceName: instance.instance_name,
                companyName: company?.name || 'la plataforma',
            }
        })

        if (sendError) {
            console.error('Error sending WhatsApp OTP:', sendError)
            return NextResponse.json(
                { error: 'Error al enviar código por WhatsApp' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Código de verificación enviado por WhatsApp',
            contactName: contact.push_name || null,
        })

    } catch (error: any) {
        console.error('Error in phone-otp:', error)
        return NextResponse.json(
            { error: error.message || 'Error interno' },
            { status: 500 }
        )
    }
}
