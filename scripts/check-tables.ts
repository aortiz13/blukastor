
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.production' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log("Checking Supabase Tables...");

    const tables = ['leads', 'generations', 'audit_logs'];

    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            console.error(`❌ Error accessing table '${table}':`, error.message);
        } else {
            console.log(`✅ Table '${table}' exists. Row count: ${count}`);
        }
    }

    // Check one row from leads to see structure
    const { data: leadsData } = await supabase.from('leads').select('*').limit(1);
    if (leadsData && leadsData.length > 0) {
        console.log('\nSample Lead Data:', leadsData[0]);
    } else {
        console.log('\nNo leads data found to inspect structure.');
    }
}

checkTables();
