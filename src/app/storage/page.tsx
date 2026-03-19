import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isThinkCookieValid, THINK_COOKIE_KEY } from "@/lib/think";

import StorageDashboard from "./components/storage-dashboard";

export default async function StoragePage() {
  const thinkCookie = (await cookies()).get(THINK_COOKIE_KEY)?.value;

  if (!isThinkCookieValid(thinkCookie)) {
    redirect("/usuario?next=/storage");
  }

  return <StorageDashboard userName="Administrador" />;
}
