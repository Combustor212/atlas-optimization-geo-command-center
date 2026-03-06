import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GEO Command Center",
  description: "Agency performance & revenue impact dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* TikTok Pixel Code */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
  ttq.load('D6DBJPJC77U1C38ED0Q0');
  ttq.page();
}(window, document, 'ttq');
            `.trim(),
          }}
        />
        {/* Fallback so theme works even if CSS bundle is delayed */}
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --background: #0a0a0f;
            --foreground: #fafafa;
            --card: #111118;
            --card-border: #1e1e2e;
            --accent: #1e3a5f;
            --accent-hover: #2563eb;
            --success: #22c55e;
            --danger: #ef4444;
            --muted: #64748b;
          }
        ` }} />
      </head>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
