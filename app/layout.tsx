import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import NextTopLoader from "nextjs-toploader";

export const metadata: Metadata = {
  title: "Pool League Manager",
  description: "Track snooker and pool stats",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <NextTopLoader color="#6366f1" showSpinner={false} shadow="0 0 10px #6366f1,0 0 5px #6366f1" />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}