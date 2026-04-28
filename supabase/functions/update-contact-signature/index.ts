import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Normalize a Brazilian phone number to its base 8-digit form
 * for cross-format matching (10 vs 11 digits).
 */
function normalizePhone(phone: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 10 && digits.length !== 11) return null;
  const dddNum = parseInt(digits.substring(0, 2));
  if (dddNum < 11 || dddNum > 99) return null;
  const numberPart = digits.substring(2);
  if (digits.length === 11) {
    if (numberPart[0] !== "9") return null;
    return digits.substring(0, 2) + numberPart.substring(1); // DDD + 8 digits
  }
  return digits; // already DDD + 8 digits
}

/**
 * Build the list of digit-only phone variants that should match
 * a stored contact (with or without the leading "9", with country code).
 */
function phoneVariants(phone: string): string[] {
  const base = normalizePhone(phone); // DDD + 8 digits, e.g. "1187654321"
  if (!base) return [];
  const ddd = base.substring(0, 2);
  const eight = base.substring(2);
  const ten = ddd + eight; // 10 digits
  const eleven = ddd + "9" + eight; // 11 digits
  return Array.from(new Set([ten, eleven]));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // --- API key authentication ---
  const expectedKey = Deno.env.get("CONTACTS_API_KEY");
  if (!expectedKey) {
    return new Response(
      JSON.stringify({ error: "Server misconfigured: CONTACTS_API_KEY missing" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const headerKey =
    req.headers.get("x-api-key") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (headerKey !== expectedKey) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // --- Parse and validate body ---
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { phone, signature } = (body ?? {}) as {
    phone?: unknown;
    signature?: unknown;
  };

  if (typeof phone !== "string" || phone.trim() === "") {
    return new Response(
      JSON.stringify({ error: "Field 'phone' is required (string)" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (signature !== 0 && signature !== 1) {
    return new Response(
      JSON.stringify({ error: "Field 'signature' must be 0 or 1" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const variants = phoneVariants(phone);
  if (variants.length === 0) {
    return new Response(
      JSON.stringify({
        error: "Invalid Brazilian phone number. Use 10 or 11 digits with valid DDD.",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // --- Update via service role (bypasses RLS, intentional for API access) ---
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await supabase
    .from("contacts")
    .update({ signature })
    .in("phone", variants)
    .select("id, name, phone, signature, user_id, group_id");

  if (error) {
    console.error("Update error:", error);
    return new Response(
      JSON.stringify({ error: "Database error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!data || data.length === 0) {
    return new Response(
      JSON.stringify({
        success: false,
        updated: 0,
        message: "No contact found matching the provided phone",
        searched_variants: variants,
      }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      updated: data.length,
      contacts: data,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
