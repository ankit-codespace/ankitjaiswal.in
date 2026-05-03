import app from "./app";
import { logger } from "./lib/logger";
import { seedWorkLogs } from "./seed";
import { ensureSchema } from "./lib/migrate";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  try {
    await ensureSchema();
  } catch (err) {
    logger.error({ err }, "Failed to ensure schema");
  }

  try {
    await seedWorkLogs();
  } catch (err) {
    logger.error({ err }, "Failed to seed work logs");
  }
});
