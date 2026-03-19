import { redirect } from "next/navigation";

export default async function ThinkRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = params.next ? `?next=${encodeURIComponent(params.next)}` : "";
  redirect(`/usuario${nextPath}`);
}
