import { setupServer } from "msw/node";

/** Shared MSW server. Handlers are added per-test via `server.use(...)`. */
export const server = setupServer();
