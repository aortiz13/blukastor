import { SupabaseClient } from '@supabase/supabase-js'

export const getCompanyByDomain = async (supabase: SupabaseClient, domain: string) => {
    // Use the RPC function to bypass RLS for public domain lookup
    const { data } = await supabase.rpc('get_company_by_domain', {
        domain_arg: domain
    }).single()

    if (data) return data as any;

    return null
}
