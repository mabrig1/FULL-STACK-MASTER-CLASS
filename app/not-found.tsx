import Link from "next/link";

export default function NotFound() {
  return (
    <main className="notFound">
      <span className="eyebrow">404 · ROUTE NOT FOUND</span>
      <h1>This learning path does not exist.</h1>
      <p>Return to the academy and choose a valid module.</p>
      <Link className="primaryButton inlineButton" href="/dashboard">Back to academy →</Link>
    </main>
  );
}
