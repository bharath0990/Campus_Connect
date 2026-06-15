const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://qynghqgbitcbczvfervg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_u63gxFokU3EOzGIPFIIXCg_R0TTYaxt';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testQuery() {
  console.log("Testing query on rooms table...");
  const { data, error } = await supabase
    .from('rooms')
    .select('*, owner:owner_id(name, trust_score)');

  if (error) {
    console.error("Query Error:", error);
  } else {
    console.log("Query Succeeded! Retrieved rooms count:", data.length);
    console.log("Data snippet:", JSON.stringify(data.slice(0, 2), null, 2));
  }
}

testQuery();
