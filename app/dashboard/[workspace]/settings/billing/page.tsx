import { redirect } from "next/navigation";

export default async function BillingReturnPage({ params, searchParams }: { params: Promise<{ workspace: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { workspace } = await params;
  const query = await searchParams;
  const next = new URLSearchParams({ section: "Billing" });
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) value.forEach(item => next.append(key, item));
    else if (value) next.set(key, value);
  }
  redirect(`/dashboard/${workspace}/settings?${next.toString()}`);
}

