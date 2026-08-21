import "dotenv/config";
import app from "./app";
import { initDatabase } from './utils/databaseService';
import { setupAssociations } from './models/associations';
import { loadSchemaLimits } from "./utils/schemaLimits";
import { enableStrictMode } from "./utils/sqlStrictMode";
const port = process.env.PORT || 3000;


async function initServer() {
    try {
        setupAssociations();
        await initDatabase();
        await enableStrictMode();    
        await loadSchemaLimits([
        "users",
        "payments",
        "roles"
        ]);

        app.listen(port, () => {
            console.log(`⚡️[servidor]: Servidor corriendo en http://localhost:${port}`);
        });
    } catch (error) {
        console.error(`⚡️[servidor]: Error al iniciar el servidor: ${error}`);
    }
}
initServer(); 
