import ResetPasswordStudio from "@/components/reset-password-studio";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <ResetPasswordStudio token={String(token || "")} />;
}
