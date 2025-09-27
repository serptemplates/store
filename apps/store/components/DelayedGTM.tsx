'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

export function DelayedGTM({ gtmId }: { gtmId: string }) {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Delay GTM loading until after initial render
    const timer = setTimeout(() => {
      setShouldLoad(true);
    }, 2000);

    // Or load on first user interaction
    const handleInteraction = () => {
      setShouldLoad(true);
      clearTimeout(timer);
    };

    window.addEventListener('scroll', handleInteraction, { once: true });
    window.addEventListener('touchstart', handleInteraction, { once: true });
    window.addEventListener('mousedown', handleInteraction, { once: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('mousedown', handleInteraction);
    };
  }, []);

  if (!shouldLoad) return null;

  return (
    <>
      <Script
        id="gtm-datalayer-delayed"
        strategy="lazyOnload"
      >
        {`window.dataLayer = window.dataLayer || [];`}
      </Script>
      <Script
        id="gtm-script-delayed"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');
          `,
        }}
      />
    </>
  );
}