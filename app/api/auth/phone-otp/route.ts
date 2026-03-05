import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

async function resolveCompanyId(supabase: any, companyId?: string, domain?: string): Promise<string | null> {
    if (companyId) return companyId

    if (!domain) return null

    // Try custom_domain exact match
    const { data: byDomain } = await supabase
        .from('client_companies')
        .select('id')
        .eq('custom_domain', domain)
        .limit(1)
        .single()
    if (byDomain) return byDomain.id

    // Try frontend_config->>'domain'
    const { data: byConfig } = await supabase
        .from('client_companies')
        .select('id')
        .eq('frontend_config->>domain', domain)
        .limit(1)
        .single()
    if (byConfig) return byConfig.id

    // Try extracting subdomain prefix (e.g. "asktitto.autoflowai.io" → search by name containing "asktitto")
    const subdomain = domain.split('.')[0]
    if (subdomain) {
        const { data: byName } = await supabase
            .from('client_companies')
            .select('id, name')
            .ilike('name', `%${subdomain}%`)
            .limit(1)
            .single()
        if (byName) return byName.id
    }

    return null
}

export async function POST(request: Request) {
    try {
        const supabase = await createServiceClient()
        const { phone, companyId: rawCompanyId, domain } = await request.json()

        if (!phone) {
            return NextResponse.json(
                { error: 'Teléfono es requerido' },
                { status: 400 }
            )
        }

        const companyId = await resolveCompanyId(supabase, rawCompanyId, domain)
        console.log('[Phone OTP] Resolved Company ID:', companyId, 'from', { rawCompanyId, domain })

        if (!companyId) {
            return NextResponse.json(
                { error: 'No se pudo identificar la empresa' },
                { status: 400 }
            )
        }

        // Normalize phone (ensure + prefix)
        const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`
        console.log('[Phone OTP] Normalized Phone:', normalizedPhone)

        // 1. Check if this phone exists in public.contacts for this company
        console.log('[Phone OTP] Querying contacts for phone:', normalizedPhone)
        const { data: contacts, error: contactError } = await supabase
            .from('contacts')
            .select('id, phone, push_name, user_id, client_company_id')
            .eq('phone', normalizedPhone)

        if (contactError) {
            console.error('[Phone OTP] Supabase Query Error:', contactError)
            return NextResponse.json({ error: 'Error en la base de datos', debug: contactError }, { status: 500 })
        }

        console.log('[Phone OTP] Found contacts for this phone:', contacts?.length || 0)

        const contact = contacts?.find((c: any) => c.client_company_id === companyId)

        if (!contact) {
            console.error('[Phone OTP] No contact match for companyId:', companyId)
            console.log('[Phone OTP] Available company IDs for this phone:', contacts?.map((c: any) => c.client_company_id))
            return NextResponse.json(
                {
                    error: 'Este número de teléfono no está registrado en esta empresa',
                    debug: {
                        foundCount: contacts?.length || 0,
                        availableCompanies: contacts?.map((c: any) => c.client_company_id),
                        targetCompany: companyId,
                        normalizedPhone
                    }
                },
                { status: 404 }
            )
        }
        console.log('[Phone OTP] Contact matched successfully:', contact.push_name)

        // 2. Get company info and WhatsApp instance
        // admin_wa_instances view uses 'company_id' instead of 'client_company_id'
        const { data: instance } = await supabase
            .from('admin_wa_instances')
            .select('instance_name, company_id')
            .eq('company_id', companyId)
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
            .from('phone_otps')
            .update({ used: true })
            .eq('phone', normalizedPhone)
            .eq('company_id', companyId)
            .eq('used', false)

        // 5. Store OTP in database
        const { error: otpError } = await supabase
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
