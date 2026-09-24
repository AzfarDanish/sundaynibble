import { getSupabaseAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Public single-order lookup. The id is an unguessable UUID generated at
// order time, so this is safe to expose. Reads go through the admin client;
// without SUPABASE_SERVICE_ROLE_KEY, RLS blocks anon reads and this 404s,
// in which case the confirmation page falls back to its session snapshot.
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return Response.json({ error: "Order not found." }, { status: 404 });
  }
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, created_at, customer_name, customer_phone, gender, kamsis, delivery_location_type, delivery_details, notes, items, subtotal, cooked_fee, delivery_fee, total, status, payment_method, receipt_url, pay_to"
    )
    .eq("id", id)
    .single();
  if (error || !data) {
    return Response.json({ error: "Order not found." }, { status: 404 });
  }
  return Response.json({ order: data });
}
