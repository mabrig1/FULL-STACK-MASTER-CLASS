import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Full Stack Master Class | AI-Powered Developer Academy",
  description:
    "Master full stack engineering, AI application development, agentic systems, SaaS, cloud and product building through adaptive project-based learning.",
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
            <Link href="/#experience">Experience</Link>
            <Link href="/#curriculum">Curriculum</Link>
            <Link href="/dashboard">Launch Academy</Link>
          </nav>
        </header>
        {children}
        <footer className="footer">
          <div>
            <strong>FULL STACK MASTER CLASS</strong>
            <p>Learn. Build. Deploy. Automate. Monetize.</p>
          </div>
          <p>Built for builders who want proof, not just certificates.</p>
        </footer>
      </body>
    </html>
  );
}
