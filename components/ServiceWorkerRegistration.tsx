"use client";

import { useEffect, useState } from "react";

export default function ServiceWorkerRegistration() {
  const [needsRefresh, setNeedsRefresh] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  setNeedsRefresh(true);
                }
              });
            }
          });
        })
        .catch((error) => {
          console.log("SW registration failed:", error);
        });
    }
  }, []);

  const reloadPage = () => {
    window.location.reload();
  };

  if (needsRefresh) {
    return (
      <button
        onClick={reloadPage}
        className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg z-50 font-bold animate-pulse"
      >
        Nueva versión disponible - Tap para actualizar
      </button>
    );
  }

  return null;
}
