import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "APGame — The Oracle's Prediction Game",
  description: "Predict the future. Earn your rank among the Oracles.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-slate-950 text-slate-100 min-h-screen`}
      >
        <nav className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md">
          <div className="mx-auto max-w-4xl flex items-center justify-between px-4 h-14">
            <Link
              href="/"
              className="text-lg font-bold tracking-tight text-amber-400"
            >
              ✦ APGame
            </Link>
            <div className="flex items-center gap-6 text-sm">
              <Link
                href="/"
                className="text-slate-400 hover:text-amber-400 transition-colors"
              >
                Home
              </Link>
              <Link
                href="/play"
                className="text-slate-400 hover:text-amber-400 transition-colors"
              >
                Play
              </Link>
              <Link
                href="/leaderboard"
                className="text-slate-400 hover:text-amber-400 transition-colors"
              >
                Leaderboard
              </Link>
              <Link
                href="/profile"
                className="text-slate-400 hover:text-amber-400 transition-colors"
              >
                Profile
              </Link>
            </div>
          </div>
        </nav>

        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>

        <Toaster
          position="bottom-right"
          toastOptions={{
            className: "bg-slate-900 border-slate-800 text-slate-100",
          }}
        />
      </body>
    </html>
  );
}
