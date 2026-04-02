// apps/client/src/components/shared/WebVitals.jsx
"use client";

import { useEffect } from "react";

export function WebVitals() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") return;

    // Simple performance monitoring without external dependency
    if (typeof window !== "undefined") {
      const perfData = performance.getEntriesByType("navigation")[0];
      if (perfData) {
        console.log(
          "[Performance] DOMContentLoaded:",
          perfData.domContentLoadedEventEnd -
            perfData.domContentLoadedEventStart,
        );
        console.log(
          "[Performance] Load:",
          perfData.loadEventEnd - perfData.fetchStart,
        );
      }
    }
  }, []);

  return null;
}
