export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const isProd = process.env.NODE_ENV === "production";

  window.addEventListener("load", () => {
    if (!isProd) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        const activateWaitingWorker = () => {
          if (!registration.waiting) return;
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        };

        if (registration.waiting) {
          activateWaitingWorker();
        }

        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener("statechange", () => {
            if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
              activateWaitingWorker();
            }
          });
        });
      })
      .catch((error) => {
        console.error("Service worker registration failed:", error);
      });
  });
}
