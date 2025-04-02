import { ThemeProvider } from './theme';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "flowbite";
import { ClerkProvider } from "@clerk/nextjs";
import ClientLayout from './components/ClientLayout';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClerkProvider>
          <ThemeProvider>
            <ClientLayout>
              {children}
            </ClientLayout>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
