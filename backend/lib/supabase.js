const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
require('dotenv').config();

const USE_MOCK = (process.env.USE_MOCK || "false").toLowerCase() === "true";

let supabase = null;
if (!USE_MOCK) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("[supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — falling back to mock mode.");
  } else {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: { transport: ws },
    });
  }
}

module.exports = { supabase, USE_MOCK: USE_MOCK || !supabase };