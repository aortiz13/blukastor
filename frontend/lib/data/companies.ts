import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'

export const getCompanyByDomain = cache(async (domain: string) => {
    const supabase = await createClient()

    // Logic: 
    // 1. Try to find by custom domain in frontend_config
    // 2. Try to find by subdomain (instance_name equivalent?)
    // For now, simpler approach: Query companies where frontend_config ->> 'domain' = domain

    // Use the RPC function to bypass RLS for public domain lookup
    const { data, error } = await supabase.rpc('get_company_by_domain', {
        domain_arg: domain
    })

        // RPC returns an array of rows or single if we handle it differently. 
        // Since RETURNS TABLE returns rows, .single() should work if we expect one.
        .single()

    if (data) return data;

    // Fallback: If it's a subdomain of our root domain, try to find by some other key?
    // e.g. client.app.com -> check 'client' against a slug field?
    // Let's assume for this MVP we match exact domain stored in config.

    return null
})
