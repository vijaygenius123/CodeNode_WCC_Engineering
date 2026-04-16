import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CaseView Architecture — Challenge 3",
  description:
    "Architecture documentation for CaseView — AI-Assisted Planning Enforcement & Street Reporting Intelligence",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
