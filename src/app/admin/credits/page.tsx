import { redirect } from "next/navigation";

export default function CreditsPage() {
  redirect("/admin/payments?tab=credits");
}

