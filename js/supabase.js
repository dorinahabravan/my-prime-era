
const SUPABASE_URL = "https://zqbnnboocqjewoiwcqon.supabase.co";

const SUPABASE_KEY = "sb_publishable_4K7sy07i0y17XeL8q_0N0Q_1fsxj0rf";

window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

console.log("Supabase initialized successfully!");
