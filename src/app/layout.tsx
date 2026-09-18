import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lucky Sevens — Free Slot Machine",
  description:
    "A free, open-source 5-reel slot machine you can play in the browser. Play money only, no real wagering.",
  openGraph: {
    title: "Lucky Sevens — Free Slot Machine",
    description:
      "A free, open-source 5-reel slot machine you can play in the browser.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0713",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
