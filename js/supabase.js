const SUPABASE_URL      = 'https://gaikgihkeysulpvjrhom.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhaWtnaWhrZXlzdWxwdmpyaG9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjI4NjMsImV4cCI6MjA5Nzg5ODg2M30.TsYnt9ToqqK1-N4DHrpT_ms16roI2fYmWpPC7q5AZvk';

const { createClient } = supabase;
const supabaseClient   = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
