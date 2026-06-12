import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import CookieBanner from "@/components/CookieBanner";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const WHATSAPP_NUMBER = "34610434957";

const title = "Tenerify.ai — Your local AI guide to Tenerife";
const description = "Discover and book the best experiences in Tenerife Sur. AI-powered, locally curated.";

export const metadata: Metadata = {
  metadataBase: new URL("https://tenerify.ai"),
  title,
  description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "Tenerify.ai",
    images: [{ url: "/hero-teide.jpg", width: 1400, height: 935, alt: "Mount Teide, Tenerife" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/hero-teide.jpg"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "TravelAgency",
  name: "Tenerify.ai",
  url: "https://tenerify.ai",
  image: "https://tenerify.ai/hero-teide.jpg",
  description,
  areaServed: {
    "@type": "Place",
    name: "Tenerife Sur, Canary Islands, Spain",
  },
  sameAs: [`https://wa.me/${WHATSAPP_NUMBER}`],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <CookieBanner />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
