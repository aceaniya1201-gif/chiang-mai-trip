// Add a Supabase project URL and publishable (anon) key to turn on five-phone cloud sync.
const isLocalSyncTest = ["127.0.0.1", "localhost"].includes(location.hostname)
  && new URLSearchParams(location.search).has("cloud-test");

window.CHIANG_MAI_SYNC = Object.freeze({
  supabaseUrl: isLocalSyncTest ? "http://127.0.0.1:4180" : "https://gxfsfsgueixvdszxavpd.supabase.co",
  supabaseAnonKey: isLocalSyncTest ? "local-smoke-test" : "sb_publishable_UxdycPfsY3xKL-skfiLTnQ_obcSc-QA",
  tripId: "4d08b651-5951-4cf9-b805-9517142a8c17",
  pollIntervalMs: 8000
});
