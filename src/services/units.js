import { supabase } from "../lib/supabase";

export async function getAll() {
  const { data, error } = await supabase
    .from("units")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  return data || [];
}

export async function create(unit) {
  const payload = {
    name: String(unit.name || "").trim(),
    is_active: unit.is_active ?? true,
  };

  const { data, error } = await supabase
    .from("units")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function update(id, unit) {
  const payload = {
    name: String(unit.name || "").trim(),
    is_active: unit.is_active ?? true,
  };

  const { data, error } = await supabase
    .from("units")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function delete_(id) {
  const { error } = await supabase
    .from("units")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw error;
}