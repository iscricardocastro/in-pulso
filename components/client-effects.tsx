"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Toaster = dynamic(() => import("sonner").then((mod) => mod.Toaster), {
  ssr: false,
});

function onIdle(callback: () => void) {
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

  if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
    const id = idleWindow.requestIdleCallback(callback, { timeout: 2500 });
    return () => idleWindow.cancelIdleCallback?.(id);
  }

  const id = globalThis.setTimeout(callback, 1200);
  return () => globalThis.clearTimeout(id);
}

export function ClientEffects() {
  const [showToaster, setShowToaster] = useState(false);

  useEffect(() => {
    return onIdle(() => {
      setShowToaster(true);

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      }

      void import("@vercel/analytics").then(({ inject }) => inject());
      void import("@vercel/speed-insights").then(({ injectSpeedInsights }) => injectSpeedInsights());
    });
  }, []);

  return showToaster ? <Toaster richColors position="top-right" /> : null;
}
