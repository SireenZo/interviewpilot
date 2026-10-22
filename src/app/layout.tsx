import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "InterviewPilot: AI Voice Mock Interviews",
  description:
    "Practice real job interviews out loud with an AI interviewer that reads your CV, asks follow-ups, runs a live coding round and scores you. English or Arabic.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <div className="relative min-h-screen overflow-x-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.25),transparent_65%)] print:hidden" />
          <SiteHeader />
          {children}
          <footer className="border-t border-white/5 py-6 text-center text-sm text-zinc-500 print:hidden">
            Built with Next.js, TypeScript and Claude ·{" "}
            <a href="/privacy" className="hover:text-zinc-300">Privacy</a> ·{" "}
            <a href="https://github.com/SireenZo/interviewpilot" className="hover:text-zinc-300">GitHub</a>
          </footer>
        </div>
      </body>
    </html>
  );
}
