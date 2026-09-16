"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function CertificateVerifier({ id }: { id: string }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch("/api/certificates/" + encodeURIComponent(id))
      .then(async (response) => ({ ok: response.ok, data: await response.json() }))
      .then(setData)
      .catch(() => setData({ ok: false, data: { valid: false } }));
  }, [id]);

  return (
    <main className="commercialPage verifyShell">
      <section className="certificateCard">
        <span className="eyebrow">PUBLIC CREDENTIAL VERIFICATION</span>
        {!data ? (
          <h1>Checking credential…</h1>
        ) : data.ok && data.data.valid ? (
          <>
            <div className="certificateSeal">✓</div>
            <h1>Verified Full Stack Master Class Credential</h1>
            <p className="certificateName">{data.data.certificate.learnerName}</p>
            <div className="credentialQr">
              <Image
                src={"/api/certificates/" + encodeURIComponent(id) + "/qr"}
                alt="Certificate verification QR code"
                width={180}
                height={180}
                unoptimized
              />
              <span>Scan to verify this credential</span>
            </div>
            <div className="certificateFacts">
              <span>ID <strong>{data.data.certificate.certificateId}</strong></span>
              <span>Readiness <strong>{data.data.certificate.readinessScore}/100</strong></span>
              <span>Verified projects <strong>{data.data.certificate.verifiedProjects}</strong></span>
              <span>Assessment passes <strong>{data.data.certificate.passedAssessments}</strong></span>
              <span>Email identity <strong>{data.data.certificate.emailVerified ? "verified" : "not recorded"}</strong></span>
              <span>Issued <strong>{new Date(data.data.certificate.issuedAt).toLocaleDateString()}</strong></span>
            </div>
          </>
        ) : (
          <>
            <div className="certificateSeal invalid">×</div>
            <h1>Credential not verified</h1>
            <p>This certificate ID is missing, invalid or revoked.</p>
          </>
        )}
      </section>
    </main>
  );
}
