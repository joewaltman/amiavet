import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AMIA_LOGO_SVG_DATA_URL } from "@/components/amia-logo";
import "./globals.css";

// Inter is our brand typeface. We load it as a CSS variable so Tailwind's
// --font-sans token can point at it in globals.css.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://amiavet.com"),
  title: {
    default:
      "Amia Vet: start with a smart answer, get a real vet when you need one",
    template: "%s · Amia Vet",
  },
  description:
    "Amia Vet gives you instant AI guidance for your pet, clearly labeled as AI, with a California-licensed veterinarian one click away to review it for $20 or meet you on a 15-minute video call for $40.",
  applicationName: "Amia Vet",
  openGraph: {
    type: "website",
    siteName: "Amia Vet",
    title: "Amia Vet: start with a smart answer. Get a real vet when you need one.",
    description:
      "Instant AI guidance for your pet, clearly labeled as AI, with a California-licensed veterinarian one click away.",
    url: "https://amiavet.com/",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Amia Vet: start with a smart answer. Get a real vet when you need one.",
    description:
      "Instant AI guidance for your pet, clearly labeled as AI, with a California-licensed veterinarian one click away.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [{ url: AMIA_LOGO_SVG_DATA_URL, type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1F6F5C",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
