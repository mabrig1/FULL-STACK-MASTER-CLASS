import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import "./commercial.css";

export const metadata: Metadata = {
  title: "Full Stack Master Class | AI Developer Academy",
  description:
    "A commercial AI-native developer academy with project verification, agentic coaching, grading, cohorts and verifiable credentials.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            <span className="brandMark">FS</span>
            <span>
              <strong>Full Stack</strong>
              <small>Master Class</small>
            </span>
          </Link>
          <nav>
            <Link href="/dashboard">Academy</Link>
            <Link href="/platform">Platform</Link>
            <Link href="/sandbox">Sandbox</Link>
            <Link href="/account">Account</Link>
          </nav>
        </header>
        {children}
        <footer className="footer">
          <div>
            <strong>FULL STACK MASTER CLASS</strong>
            <p>Learn. Build. Verify. Deploy. Monetize.</p>
          </div>
          <p>Proof-first developer education powered by contextual AI.</p>
        </footer>
      </body>
    </html>
  );
}
