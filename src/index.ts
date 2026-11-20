import "dotenv/config";
import app from "./app";
import { initDatabase } from './utils/databaseService';
import { setupAssociations } from './models/associations';
import { loadSchemaLimits } from "./utils/schemaLimits";
import { enableStrictMode } from "./utils/sqlStrictMode";
import sequelize from "./utils/databaseService";
import { logger } from "./utils/logger";
import type { Server } from "http";
const port = process.env.PORT || 3000;
let server: Server | undefined;
let shuttingDown = false;

async function shutdown(reason: string, exitCode = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("Server shutdown started", { reason, exitCode });

    try {
        if (server) {
            await new Promise<void>((resolve, reject) => {
                server!.close((error) => error ? reject(error) : resolve());
            });
        }
        await sequelize.close();
        logger.info("Server shutdown completed", { reason });
        process.exit(exitCode);
    } catch (error) {
        logger.error("Server shutdown failed", { reason, error });
        process.exit(1);
    }
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("uncaughtException", (error) => {
    logger.error("Uncaught exception", { error });
    void shutdown("uncaughtException", 1);
});
process.once("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection", { reason });
    void shutdown("unhandledRejection", 1);
});


async function initServer() {
    logger.info("Server initialization started", {
        environment: process.env.NODE_ENV ?? "development",
        port: Number(port),
    });
    try {
        setupAssociations();
        await initDatabase();
        await enableStrictMode();    
        await loadSchemaLimits([
        "users",
        "payments",
        "roles"
        ]);

        server = app.listen(port, () => {
            logger.info("Server listening", {
                port: Number(port),
                environment: process.env.NODE_ENV ?? "development",
            });
        });
        server.on("error", (error) => {
            logger.error("HTTP server error", { error });
        });
    } catch (error) {
        logger.error("Server initialization failed", { error });
        process.exitCode = 1;
    }
}
initServer(); 
