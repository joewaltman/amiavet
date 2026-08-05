import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Amia Vet — smart answers, real vets",
  description:
    "Ask about your pet and get instant AI guidance, clearly labeled as AI, with a California-licensed veterinarian one click away.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          rel="icon"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%231F6F5C'/%3E%3Cpath d='M20.5 10.5v11M20.5 13.2c-1-1.9-2.9-3-5-3a5.3 5.3 0 100 10.6c2.1 0 4-1.1 5-3' fill='none' stroke='%23FBF9F4' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M24.6 20.2c.9-.8 1.5-1.6 1.5-2.5a1.5 1.5 0 00-2.7-.9 1.5 1.5 0 00-2.7.9c0 .9.6 1.7 1.5 2.5l1.2 1z' fill='%23C2410C'/%3E%3C/svg%3E"
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
