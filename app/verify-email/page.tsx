import VerifyEmailStudio from "@/components/verify-email-studio";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <VerifyEmailStudio token={String(token || "")} />;
}
