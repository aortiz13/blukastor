import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
    const user_id = '8a032804-429b-4ca9-b392-7663167137f5'
    const companyIdToUse = 'ad1599a5-6215-49fb-b56b-e314bef6e2ab'

    console.log('Inserting into wa_contacts_view...')
    const { data: waContact, error: waError } = await serviceClient
        .from('wa_contacts_view') // updatable view
        .insert({
            company_id: companyIdToUse, // view aliases client_company_id as company_id
            user_id: user_id,
            push_name: 'Admin - testview',
            phone: 'adminV_' + user_id.substring(0, 8),
        })
        .select('id, company_id')
        .single()

    if (waError) {
        console.error('Insert error:', waError)
    } else {
        console.log('Success:', waContact)
    }
}

run()
