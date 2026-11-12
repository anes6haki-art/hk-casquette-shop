import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import MetaPixel from "./meta-pixel";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hk casquette shop — قبعات في الجزائر",
  description:
    "اكتشفوا مجموعة Hk casquette shop. اطلبوا قبعاتكم مع التوصيل إلى الولايات الـ58 والدفع عند الاستلام.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Script id="meta-pixel" strategy="beforeInteractive">
          {`(function(w,d){
if(w.__metaPixelBootstrapStarted)return;
w.__metaPixelBootstrapStarted=true;
w.__metaPixelReady=false;
if(!w.fbq){
  var n=w.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!w._fbq)w._fbq=n;
  n.push=n;n.loaded=true;n.version='2.0';n.queue=[];
}
if(!w.__fbPixelInitialized){
  w.__fbPixelInitialized=true;
  w.fbq('init','1775961124238403');
}
w.fbq('track','PageView');
var attempts=0,maxAttempts=4;
function loadPixel(){
  attempts++;
  var script=d.createElement('script');
  var settled=false;
  var timeout=setTimeout(function(){
    failLoad('timed out');
  },10000);
  function failLoad(reason){
    if(settled)return;
    settled=true;
    clearTimeout(timeout);
    script.onload=null;
    script.onerror=null;
    if(script.parentNode)script.parentNode.removeChild(script);
    console.error('[Meta Pixel] External script load attempt '+attempts+'/'+maxAttempts+' '+reason+'.');
    if(attempts<maxAttempts){
      setTimeout(loadPixel,1000*Math.pow(2,attempts-1));
    }else{
      w.__metaPixelLoadFailed=true;
      w.dispatchEvent(new Event('meta-pixel-load-failed'));
    }
  }
  script.async=true;
  script.src='https://connect.facebook.net/en_US/fbevents.js';
  script.onload=function(){
    if(settled)return;
    settled=true;
    clearTimeout(timeout);
    w.__metaPixelReady=true;
    w.__metaPixelLoadFailed=false;
    w.dispatchEvent(new Event('meta-pixel-ready'));
  };
  script.onerror=function(){failLoad('failed');};
  var first=d.getElementsByTagName('script')[0];
  if(first&&first.parentNode)first.parentNode.insertBefore(script,first);
  else d.head.appendChild(script);
}
loadPixel();
})(window,document);`}
        </Script>
        <MetaPixel />
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element -- Meta Pixel needs a raw image fallback when JavaScript is disabled. */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1775961124238403&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        <a
          href="https://wa.me/213540404661"
          target="_blank"
          rel="noopener noreferrer"
          className="whatsapp-float-pill"
          aria-label="تواصل معنا عبر واتساب"
        >
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="#25D366">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.101-.471-.149-.673.149-.202.297-.771.966-.944 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.673-1.612-.916-2.207-.242-.579-.487-.5-.673-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.298-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.148.198 2.098 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.082 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.099-.124-.273-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378L4.2 14.97l1.637-1.47 2.44 1.47a8.833 8.833 0 004.253 1.485l.195-.008.195-.013a9.856 9.856 0 006.03-3.582l.558-.882-1.58-2.333a9.86 9.86 0 00-6.242-4.65l-.104.005c-.5.082-1.033.118-1.57.12-1.463.002-2.76-.435-3.66-1.246-.9-.811-1.5-2.038-1.5-3.422C4.861 5.354 11.964 3 19.902 3h.046c8.316 0 15.056 6.74 15.056 15.061s-6.74 15.059-15.056 15.059c-3.94 0-7.621-1.439-10.43-4.039m0 0"/>
          </svg>
          <span>تواصل معنا</span>
        </a>
      </body>
    </html>
  );
}
