/* =====================================================================
   NAVIDIX — where the account layer points.

   Both values below are public on purpose. The publishable key is meant
   to sit in a browser and be read by anyone; Supabase says so itself on
   the page it comes from. What stops a reader from seeing another
   reader's rows is not this key being secret — it is the row level
   security in supabase/schema.sql, which is checked on the server for
   every single request.

   What must never appear in this file, or anywhere else in this repo:
   the secret key (sb_secret_…) and the database password. Those do
   bypass every policy.
   ===================================================================== */
window.NVX_SUPABASE = {
  url: 'https://ikibfjaisweydmdclvba.supabase.co',
  key: 'sb_publishable_Ob3bCHsRg4zZGxKCrPSSeg_69wxx_Kx'
};
