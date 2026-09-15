import CertificateVerifier from "@/components/certificate-verifier";

export default async function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CertificateVerifier id={id} />;
}
