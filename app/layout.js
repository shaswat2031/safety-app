import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SafetyProvider } from "@/context/SafetyContext";
import Navbar from "@/components/Navbar";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Vedanta Safety 360 | Industrial Emergency Response",
  description:
    "Enterprise Employee Safety Response & Emergency Management Application by RYM Grenergy Solution for Vedanta Limited.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50 text-slate-900 flex flex-col selection:bg-red-500 selection:text-white antialiased">
        <AuthProvider>
          <SafetyProvider>
            <Navbar />
            <main className="flex-1 flex flex-col">{children}</main>
            <Toaster position="top-right" richColors theme="light" />
          </SafetyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
