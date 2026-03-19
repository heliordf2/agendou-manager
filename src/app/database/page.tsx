import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isThinkCookieValid, THINK_COOKIE_KEY } from "@/lib/think";

import ManagerDashboard from "../manager/components/manager-dashboard";

export default async function DatabasePage() {
  const thinkCookie = (await cookies()).get(THINK_COOKIE_KEY)?.value;

  if (!isThinkCookieValid(thinkCookie)) {
    redirect("/usuario?next=/database");
  }

  return <ManagerDashboard userName="Administrador" panelTitle="Painel Database" allowCreate={false} />;
}
