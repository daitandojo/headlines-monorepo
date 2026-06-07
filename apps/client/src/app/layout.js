// apps/client/src/app/layout.js
import "./globals.css";
import { AppProviders } from "./providers";
import { AppWrapper } from "./_components/AppWrapper";
import { WebVitals } from "@/components/shared/WebVitals";
import { Playfair_Display } from "next/font/google";

export const metadata = {
  title: "Headlines Intelligence",
  description: "AI-Powered Wealth Event Discovery.",
};

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${playfairDisplay.variable}`}>
      <body className="bg-background text-foreground">
        <AppProviders>
          <AppWrapper>{children}</AppWrapper>
          <WebVitals />
        </AppProviders>
      </body>
    </html>
  );
}
