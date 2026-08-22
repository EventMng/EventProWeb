import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EventPro - Organizer Management Dashboard",
  description: "Enterprise event management ecosystem, live attendance tracking & QR ticketing.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Font: Urbanist */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Urbanist:ital,wght@0,300..900;1,300..900&display=swap"
          rel="stylesheet"
        />
        {/* Google Font: Material Symbols Outlined */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          fontFamily: "'Urbanist', sans-serif",
          margin: 0,
          padding: 0,
          backgroundColor: '#F9FAFB',
          color: '#111827',
        }}
      >
        {children}
      </body>
    </html>
  );
}
