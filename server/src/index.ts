import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  authenticateRequest,
  getAuthMode,
  IdentityError,
  unauthorizedResponse,
} from "./auth/identity";
import { ensureDefaultUser } from "./db/users";
import { SshSession } from "./do/ssh-session";
import { dashboardRoutes } from "./routes/dashboards";
import { aiRoutes } from "./routes/ai";
import { authRoutes } from "./routes/auth";
import { meRoutes } from "./routes/me";
import { onboardingRoutes } from "./routes/onboarding";
import { savedPasswordRoutes } from "./routes/saved-passwords";
import { savedPrivateKeyRoutes } from "./routes/saved-private-keys";
import { serverRoutes } from "./routes/servers";
import { sessionRoutes } from "./routes/sessions";
import type { Variables } from "./types";

export { SshSession };

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const NO_INDEX_HEADER = "noindex, nofollow, noarchive";

function isPublicApiPath(pathname: string): boolean {
  return (
    pathname === "/api/health" || pathname.startsWith("/api/v1/onboarding/")
  );
}

app.use(
  "*",
  cors({
    origin: (origin) => origin ?? "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Cf-Access-Jwt-Assertion"],
  }),
);

app.use("*", async (c, next) => {
  const mode = await getAuthMode(c.env);
  const pathname = new URL(c.req.url).pathname;
  const acceptsJson = pathname.startsWith("/api/");

  const applyNoIndex = () => {
    c.header("X-Robots-Tag", NO_INDEX_HEADER);
  };

  if (pathname.startsWith("/api/") && isPublicApiPath(pathname)) {
    await next();
    return;
  }

  if (mode === "onboarding") {
    if (pathname.startsWith("/api/")) {
      applyNoIndex();
      return c.json({ error: "Setup required", authMode: "onboarding" }, 403);
    }

    await next();
    applyNoIndex();
    return;
  }

  try {
    await authenticateRequest(c.req.raw, c.env);
    if (acceptsJson) {
      c.set("user", await ensureDefaultUser(c.env.DB));
    }
  } catch (error) {
    if (error instanceof IdentityError) {
      const response = unauthorizedResponse(error, acceptsJson);
      if (mode === "basic") {
        response.headers.set("X-Robots-Tag", NO_INDEX_HEADER);
      }
      return response;
    }
    console.error("identity error", error);
    const response = acceptsJson
      ? c.json({ error: "Unauthorized" }, 401)
      : new Response("Unauthorized", { status: 401 });
    if (mode === "basic") {
      response.headers.set("X-Robots-Tag", NO_INDEX_HEADER);
    }
    return response;
  }

  await next();
  if (mode === "basic") {
    applyNoIndex();
  }
});

app.get("/api/health", (c) => c.json({ ok: true }));

app.route("/api/v1/onboarding", onboardingRoutes);

const v1 = new Hono<{ Bindings: Env; Variables: Variables }>();
v1.route("/auth", authRoutes);
v1.route("/me", meRoutes);
v1.route("/servers", serverRoutes);
v1.route("/saved-passwords", savedPasswordRoutes);
v1.route("/saved-private-keys", savedPrivateKeyRoutes);
v1.route("/dashboards", dashboardRoutes);
v1.route("/sessions", sessionRoutes);
v1.route("/ai", aiRoutes);

app.route("/api/v1", v1);

app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;

/*
 * ternssh mobile adaptation
 * Add the entire contents of this file to the END of:
 * web/src/index.css
 *
 * Desktop layout (>= 769px) is unchanged.
 */

@media (max-width: 768px) {
  :root {
    --app-min-width: 0px;
    --workspace-header-height: 46px;
    --workspace-header-margin-bottom: 0px;
    --grid-margin-x: 8px;
    --grid-margin-y: 8px;
  }

  html,
  body,
  #root,
  .app-shell,
  .workspace,
  .workspace-header {
    min-width: 0 !important;
    width: 100% !important;
    max-width: 100vw !important;
  }

  html,
  body,
  #root,
  .app-shell {
    height: 100%;
  }

  body {
    overflow-x: hidden !important;
    overflow-y: hidden !important;
    overscroll-behavior: none;
  }

  .app-shell {
    overflow: hidden !important;
  }

  .workspace-header {
    box-sizing: border-box;
    height: var(--workspace-header-height);
    padding: 0 10px;
    gap: 8px;
  }

  .app-brand {
    max-width: 42vw;
    font-size: 12px;
  }

  .app-brand-logo {
    width: 20px;
    height: 20px;
  }

  .app-header-actions,
  .app-status {
    gap: 4px;
  }

  .workspace {
    box-sizing: border-box;
    height: calc(100dvh - var(--workspace-header-height));
    overflow-x: hidden !important;
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch;
    padding: 8px;
  }

  /*
   * The upstream dashboard uses absolute positioning on a 12-column desktop grid.
   * On phones we deliberately turn it into a single-column document flow.
   */
  .grid-dashboard-host {
    display: flex !important;
    flex-direction: column;
    gap: 8px;
    width: 100% !important;
    min-width: 0 !important;
    height: auto !important;
    min-height: 100% !important;
    padding: 0 !important;
    background-size: 48px 48px;
  }

  .grid-dashboard-dots {
    position: fixed;
  }

  .grid-dashboard-host > .grid-dashboard-item {
    position: relative !important;
    inset: auto !important;
    transform: none !important;
    width: 100% !important;
    min-width: 0 !important;
    height: min(68dvh, 620px) !important;
    min-height: 360px !important;
    flex: 0 0 auto;
    box-sizing: border-box;
    touch-action: auto !important;
    will-change: auto;
  }

  /* Server list is more useful when compact. */
  .grid-dashboard-host > .grid-dashboard-item:has(.server-list-widget) {
    height: min(46dvh, 430px) !important;
    min-height: 280px !important;
  }

  /* Give SSH terminal most of the phone screen. */
  .grid-dashboard-host > .grid-dashboard-item:has(.terminal-widget-host) {
    height: calc(100dvh - var(--workspace-header-height) - 24px) !important;
    min-height: 520px !important;
  }

  /* File manager gets a comfortable full-screen-like area. */
  .grid-dashboard-host > .grid-dashboard-item:has(.file-manager-widget) {
    height: min(76dvh, 700px) !important;
    min-height: 480px !important;
  }

  .widget-drag-handle {
    height: 38px;
    padding-left: 8px !important;
  }

  /* Dragging/resizing a dashboard is a desktop interaction.
     Disable the handles on touch-sized screens without changing desktop. */
  .widget-drag-grip,
  .widget-resize-handle {
    display: none !important;
  }

  .widget-drag-actions {
    gap: 4px;
    padding-right: 4px;
  }

  .widget-body {
    min-width: 0;
    overflow: hidden;
  }

  .server-list-widget,
  .file-manager-widget,
  .terminal-widget-host {
    width: 100%;
    min-width: 0;
  }

  /* Avoid iOS zooming the page when focusing small form fields. */
  input,
  textarea,
  select {
    font-size: 16px !important;
  }

  /* Terminal / xterm mobile sizing. */
  .terminal-widget-host,
  .terminal-widget-host .xterm,
  .terminal-widget-host .xterm-screen,
  .terminal-widget-host .xterm-viewport {
    max-width: 100% !important;
  }

  .terminal-widget-host .xterm {
    touch-action: pan-y;
  }

  .workspace-toast {
    top: calc(var(--workspace-header-height) + 6px);
    width: calc(100vw - 24px);
    max-width: none;
    box-sizing: border-box;
    text-align: center;
  }
}

/* Very small phones */
@media (max-width: 420px) {
  .workspace {
    padding: 6px;
  }

  .grid-dashboard-host {
    gap: 6px;
  }

  .widget-drag-label {
    font-size: 11px;
  }

  .grid-dashboard-host > .grid-dashboard-item:has(.terminal-widget-host) {
    min-height: 500px !important;
  }
}

/* Landscape phones: prioritize terminal height without forcing huge vertical cards. */
@media (max-width: 900px) and (orientation: landscape) and (max-height: 520px) {
  .grid-dashboard-host > .grid-dashboard-item {
    height: calc(100dvh - var(--workspace-header-height) - 18px) !important;
    min-height: 320px !important;
  }
}
