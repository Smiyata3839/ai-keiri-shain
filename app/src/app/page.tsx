import { redirect } from "next/navigation";
import { headers } from "next/headers";

const MOBILE_RE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

export default async function Home() {
  const headersList = await headers();
  const ua = headersList.get("user-agent") ?? "";

  if (MOBILE_RE.test(ua)) {
    redirect("/m/dashboard");
  }

  redirect("/dashboard");
}
