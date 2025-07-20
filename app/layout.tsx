import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3b82f6" },
    { media: "(prefers-color-scheme: dark)", color: "#1e293b" },
  ],
  colorScheme: "dark",
};

export const metadata: Metadata = {
  title: "Tic-Tac-Toe Online - Multiplayer Game",
  description: "Play Tic-Tac-Toe online with friends in real-time. Features live chat, multiplayer gameplay, and modern mobile-friendly UI.",
  keywords: ["tic-tac-toe", "multiplayer", "online game", "real-time", "chat", "mobile game", "web app"],
  authors: [{ name: "Tic-Tac-Toe Online" }],
  creator: "Tic-Tac-Toe Online",
  publisher: "Tic-Tac-Toe Online",
  robots: "index, follow",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "Tic-Tac-Toe Online - Multiplayer Game",
    description: "Play Tic-Tac-Toe online with friends in real-time. Features live chat, multiplayer gameplay, and modern mobile-friendly UI.",
    type: "website",
    locale: "en_US",
    url: "https://tic-tac-toe-online-vercel.vercel.app",
    siteName: "Tic-Tac-Toe Online",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Tic-Tac-Toe Online Game",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tic-Tac-Toe Online - Multiplayer Game",
    description: "Play Tic-Tac-Toe online with friends in real-time. Features live chat, multiplayer gameplay, and modern mobile-friendly UI.",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tic-Tac-Toe Online",
  },
  formatDetection: {
    telephone: false,
    date: false,
    address: false,
    email: false,
    url: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Tic-Tac-Toe Online",
    "application-name": "Tic-Tac-Toe Online",
    "msapplication-TileColor": "#1e293b",
    "msapplication-config": "/browserconfig.xml",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        {/* Enhanced Mobile Support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Tic-Tac-Toe Online" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />

        {/* PWA Support */}
        <meta name="application-name" content="Tic-Tac-Toe Online" />
        <meta name="msapplication-TileColor" content="#1e293b" />
        <meta name="msapplication-config" content="/browserconfig.xml" />

        {/* iOS Safari specific */}
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="apple-mobile-web-app-orientations" content="portrait-any" />

        {/* Android Chrome specific */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-status-bar-style" content="black-translucent" />

        {/* Prevent zoom on input focus (iOS) */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />

        {/* Fonts loaded via Next.js font optimization */}

        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="//pusher.com" />
        <link rel="dns-prefetch" href="//vercel.app" />

        {/* Preconnect to critical third-party origins */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        <div id="app-root">
          {children}
        </div>

        {/* Service Worker will be added in future PWA enhancement */}

        {/* Focus management for better accessibility */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Add mouse user class for focus management
              let isMouseUser = false;
              document.addEventListener('mousedown', () => {
                isMouseUser = true;
                document.body.classList.add('mouse-user');
              });
              document.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                  isMouseUser = false;
                  document.body.classList.remove('mouse-user');
                }
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
