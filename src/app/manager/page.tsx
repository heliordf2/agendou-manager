import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isThinkCookieValid, THINK_COOKIE_KEY } from "@/lib/think";

import BasicManagerDashboard from "./components/basic-manager-dashboard";

export default async function ManagerPage() {
  const thinkCookie = (await cookies()).get(THINK_COOKIE_KEY)?.value;

  if (!isThinkCookieValid(thinkCookie)) {
    redirect("/usuario?next=/manager");
  }

  return <BasicManagerDashboard />;
}
