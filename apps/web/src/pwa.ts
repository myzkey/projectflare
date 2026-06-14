export type ServiceWorkerUpdateEvent = CustomEvent<ServiceWorkerRegistration>;

const swUpdateEvent = "projectflare:sw-update";

declare global {
  interface WindowEventMap {
    [swUpdateEvent]: ServiceWorkerUpdateEvent;
  }
}

export function registerProjectFlareServiceWorker() {
  if (!("serviceWorker" in navigator) || !shouldRegisterServiceWorker()) return;

  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").then((registration) => {
      if (registration.waiting) {
        dispatchUpdate(registration);
      }

      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;

        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            dispatchUpdate(registration);
          }
        });
      });
    });
  });
}

export function applyServiceWorkerUpdate(registration: ServiceWorkerRegistration) {
  const waiting = registration.waiting;
  if (!waiting) {
    window.location.reload();
    return;
  }

  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
  waiting.postMessage({ type: "SKIP_WAITING" });
}

function dispatchUpdate(registration: ServiceWorkerRegistration) {
  window.dispatchEvent(new CustomEvent(swUpdateEvent, { detail: registration }));
}

function shouldRegisterServiceWorker() {
  const { hostname, protocol } = window.location;
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  return protocol === "https:" || !localHosts.has(hostname);
}
