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

    if (data) return data as any;

    return null
})
