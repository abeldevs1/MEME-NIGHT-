const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const code = 'AQVB';
  const { data: room } = await supabase.from('rooms').select('*').eq('code', code).single();
  const { data: caps } = await supabase.from('round_captions').select('*').eq('room_code', code);
  const { data: players } = await supabase.from('players').select('*').eq('room_code', code);
  console.log("Room mode:", room.mode, "Status:", room.status);
  console.log("Captions:", caps.length, "Players:", players.length);
}
run();
