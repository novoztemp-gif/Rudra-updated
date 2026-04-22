import { supabase } from "../lib/supabase";

export async function getAll() {
  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  return data || [];
}

export async function create(category) {
  const payload = {
    name: String(category.name || "").trim(),
    is_active: category.is_active ?? true,
  };

  const { data, error } = await supabase
    .from("product_categories")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function update(id, category) {
  const payload = {
    name: String(category.name || "").trim(),
    is_active: category.is_active ?? true,
  };

  const { data, error } = await supabase
    .from("product_categories")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function delete_(id) {
  const { error } = await supabase
    .from("product_categories")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw error;
}