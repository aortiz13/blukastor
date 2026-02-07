import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'

export const getCompanyByDomain = cache(async (domain: string) => {
    const supabase = await createClient()

    // Logic: 
    // 1. Try to find by custom domain in frontend_config
    // 2. Try to find by subdomain (instance_name equivalent?)
    // For now, simpler approach: Query companies where frontend_config ->> 'domain' = domain

    // Note: JSONB filtering syntax
    const { data, error } = await supabase
        .from('companies')
        .select('*')
        .filter('frontend_config->>domain', 'eq', domain)
        .single()

    if (data) return data;

    // Fallback: If it's a subdomain of our root domain, try to find by some other key?
    // e.g. client.app.com -> check 'client' against a slug field?
    // Let's assume for this MVP we match exact domain stored in config.

    return null
})
