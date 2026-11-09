import type { Metadata } from "next";
import "./globals.css";
import { LocalSpeechProvider } from "../components/local-speech";
import { LanguageProvider } from "../components/language";

export const metadata: Metadata = {
  title: "कृषि साथी · हर आवेदन आगे बढ़े",
  description: "किसान की आवाज़ से अधिकारी के निर्णय तक — हिंदी में कृषि सहायता का डेमो कार्यक्षेत्र।",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hi">
      <body className="antialiased"><LanguageProvider><LocalSpeechProvider>{children}</LocalSpeechProvider></LanguageProvider></body>
    </html>
  );
}
