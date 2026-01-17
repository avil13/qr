import "./assets/main.css";

import { ViteSSG } from "vite-ssg";

import { routes } from "vue-router/auto-routes";
import App from "./App.vue";

export const createApp = ViteSSG(
  App,
  {
    routes,
    base: import.meta.env.BASE_URL,
  },
  ({ router }) => {
    // GitHub Pages SPA fallback:
    // public/404.html redirects unknown paths to /qr/?p=<encoded original path>.
    // Restore the original route after Vue Router initializes.

    if (!import.meta.env.SSR) {
      const params = new URLSearchParams(window.location.search);
      const p = params.get("p");
      if (p) {
        const baseUrl = import.meta.env.BASE_URL;
        const baseNoSlash = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

        let decoded = "";
        try {
          decoded = decodeURIComponent(p);
        } catch {
          decoded = p;
        }
        if (!decoded.startsWith("/")) decoded = `/${decoded}`;

        // Strip base URL from decoded path if present, as router.replace expects path relative to base
        let pathToNavigate = decoded;
        if (baseNoSlash && decoded.startsWith(baseNoSlash)) {
          pathToNavigate = decoded.slice(baseNoSlash.length);
          if (!pathToNavigate.startsWith("/")) pathToNavigate = `/${pathToNavigate}`;
        }

        // Use router.replace instead of window.history to ensure router state is updated
        router.replace(pathToNavigate).catch((err) => {
          console.error("Router replace error:", err);
        });
      }
    }

    // ctx.app.use(createPinia());
    // ctx.app.use(MotionPlugin);
  }
);
