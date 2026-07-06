import Script from "next/script";

export function PixelScripts({ tiktokPixelId, metaPixelId, gaMeasurementId }: {
  tiktokPixelId?: string;
  metaPixelId?: string;
  gaMeasurementId?: string;
}) {
  const tiktok = tiktokPixelId;
  const meta = metaPixelId;
  const ga = gaMeasurementId;
  const tiktokLoader = tiktok ? `!function(w,d,t){var pixelId=${JSON.stringify(tiktok)},testCode=null;try{testCode=new URLSearchParams(w.location.search).get("tt_test_code")||w.sessionStorage.getItem("cyniical_tiktok_test_code")}catch(e){}if(w.__cyniicalTikTokInstalled===pixelId)return;w.__cyniicalTikTokInstalled=pixelId;w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];w.__cyniicalTtq=ttq;ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=d.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=d.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};w.__cyniicalTikTokDebug={pixelId:pixelId,loaderRequested:true,pageCalled:false,lastClick:null,testEventCode:testCode};ttq.load(pixelId);ttq.page(testCode?{test_event_code:testCode}:undefined);w.__cyniicalTikTokDebug.pageCalled=true;}(window,document,'ttq');` : "";

  return <>
    {tiktok && <Script id="tiktok-pixel" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: tiktokLoader }} />}
    {meta && <Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(meta)});fbq('track','PageView');`}</Script>}
    {ga && <><Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" /><Script id="ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config',${JSON.stringify(ga)});`}</Script></>}
  </>;
}
