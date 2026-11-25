/* =========================================================
   KONFIGURASI DATABASE ONLINE (Supabase)
   ---------------------------------------------------------
   Kosongkan kedua nilai di bawah  -> website berjalan dalam
   mode DEMO (data hanya tersimpan di browser masing-masing).

   Isi dengan data dari Supabase   -> website memakai database
   online: perubahan admin & data peserta tersimpan terpusat
   dan terlihat oleh semua pengguna.

   Cara mendapatkan nilainya: Supabase Dashboard > Project
   Settings > API (atau "Connect"):
   - supabaseUrl : Project URL, contoh https://abcdxyz.supabase.co
   - supabaseKey : Publishable key (sb_publishable_...) atau
                   anon public key (eyJ...)
   JANGAN PERNAH mengisi "secret" / "service_role" key di sini.
   ========================================================= */
window.LMS_CONFIG = {
  supabaseUrl: 'https://iifwrkylanfkqqimrtuw.supabase.co',
  supabaseKey: 'sb_publishable_IE-vLSmY5VTQCUCzSuWy7Q_YjX15iZC'
};
