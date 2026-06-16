/**
 * ============================================================================
 * NEXT.JS INSTRUMENTATION — runs once when the server boots
 * ============================================================================
 * This is Next.js's official startup hook. We use it to start the SMS
 * reminder scheduler so it runs automatically with the dev server — no
 * crontab, no separate process, no system configuration.
 *
 * Docs: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 * ============================================================================
 */

export async function register() {
  // Only run on the server (Node.js runtime), not during builds or on Edge
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("./lib/scheduler");
    startScheduler();
  }
}
