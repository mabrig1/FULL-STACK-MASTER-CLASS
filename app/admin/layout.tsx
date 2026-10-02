import { redirect } from "next/navigation";
import { canManageAcademy, getCurrentUser } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canManageAcademy(user)) redirect("/dashboard");
  return children;
}
