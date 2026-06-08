import { supabase } from "./supabase";

// Drop-in replacement for the prototype's `store`.
// Prototype called: store.get(key, shared) / store.set(key, value, shared) / store.list(prefix, shared)
// The `shared` argument is accepted and ignored (everything lives in one shared kv table).
// Values are stored as JSONB, so no JSON.parse/stringify is needed at call sites.

export const db = {
  async get(key, _shared) {
    const { data, error } = await supabase.from("kv").select("value").eq("key", key).maybeSingle();
    if (error || !data) return null;
    return data.value;
  },
  async set(key, value, _shared) {
    const { error } = await supabase.from("kv").upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) console.error("db.set", error);
    return !error;
  },
  async list(prefix, _shared) {
    const { data, error } = await supabase.from("kv").select("key").like("key", `${prefix}%`);
    if (error || !data) return [];
    return data.map((r) => r.key);
  },
};
