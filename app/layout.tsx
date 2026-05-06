import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}