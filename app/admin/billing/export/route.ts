import { NextResponse } from "next/server";
import { requirePlatformAdminContext } from "@/services/context";

export async function GET() {
  const { service } = await requirePlatformAdminContext();
  const { data, error } = await service
    .from("billing_events")
    .select("occurred_at, type, amount, currency, note, tenants(name, slug), platform_users(email)")
    .order("occurred_at", { ascending: false })
    .limit(1000);

  if (error) throw new Error(error.message);

  const rows = [
    ["fecha", "tipo", "compania", "slug", "monto", "moneda", "nota", "admin"],
    ...(data ?? []).map((event) => {
      const tenant = Array.isArray(event.tenants) ? event.tenants[0] : event.tenants;
      const platformUser = Array.isArray(event.platform_users) ? event.platform_users[0] : event.platform_users;

      return [
        event.occurred_at,
        event.type,
        tenant?.name ?? "",
        tenant?.slug ?? "",
        String(event.amount ?? 0),
        event.currency,
        event.note ?? "",
        platformUser?.email ?? "",
      ];
    }),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Disposition": `attachment; filename="pulso-facturacion.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
