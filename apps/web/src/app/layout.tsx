import type { Metadata } from "next";
import { Lora, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/lib/toast-context";
import { OrderNotifications } from "@/components/order-notifications";

// Warm serif for headings, clean sans for body — self-hosted by Next
// (no runtime request to Google Fonts, no layout-shift flash).
const lora = Lora({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-lora" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "RR Kitchen",
  description: "Fresh, home-made food — dine-in, takeaway & local delivery",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lora.variable} ${inter.variable}`}>
      <body>
        <AuthProvider>
          <ToastProvider>
            <OrderNotifications />
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
