import { supabase } from '../lib/supabase';

const mapConfig = (row) => ({
  id: row.id,
  companyId: row.company_id,
  apiKey: row.api_key,
  apiSecret: row.api_secret,
  gstin: row.gstin,
  ewbUsername: row.ewb_username,
  ewbPassword: row.ewb_password,
  environment: row.environment,
  backendUrl: row.backend_url,
  updatedBy: row.updated_by,
  updatedAt: row.updated_at,
});

const unmapConfig = (obj) => ({
  company_id: obj.companyId,
  api_key: obj.apiKey,
  api_secret: obj.apiSecret,
  gstin: obj.gstin,
  ewb_username: obj.ewbUsername,
  ewb_password: obj.ewbPassword,
  environment: obj.environment,
  backend_url: obj.backendUrl,
});

export async function get() {
  try {
    const { data, error } = await supabase
      .from('gsp_config')
      .select('*')
      .limit(1);

    if (error) {
      // If table doesn't exist or query fails, return null
      console.warn('GSP config fetch failed (non-critical):', error.message);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return mapConfig(data[0]);
  } catch (err) {
    // Silently return null if gsp_config doesn't exist yet
    console.warn('GSP config fetch failed (non-critical):', err.message);
    return null;
  }
}

export async function upsert(config) {
  // Get the first (and should be only) row
  const existing = await get();

  if (existing) {
    const { data, error } = await supabase
      .from('gsp_config')
      .update(unmapConfig(config))
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return mapConfig(data);
  } else {
    const { data, error } = await supabase
      .from('gsp_config')
      .insert([unmapConfig(config)])
      .select()
      .single();

    if (error) throw error;
    return mapConfig(data);
  }
}
