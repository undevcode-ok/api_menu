import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from "./middlewares/errorHandler";
dotenv.config();
import { initDatabase } from './utils/databaseService';
import userRouter from "./routes/userRouter";
import { setupAssociations } from './models/associations';
import authRouter from "./routes/authRouter";
import roleRouter from "./routes/roleRouter";
import paymentRouter from "./routes/paymentRouter";
import { loadSchemaLimits } from "./utils/schemaLimits";
import { enableStrictMode } from "./utils/sqlStrictMode";
import menuRouter from "./routes/menuRouter";
import imageRouter from "./routes/imageRouter";
import categoryRouter from "./routes/categoryRouter";
import itemRouter from "./routes/itemRouter";
import { tenantMiddleware } from './middlewares/tenant';
import publicMenuRouter from "./routes/publicMenuRouter";

const app = express();
const port = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());


app.use("/api/users", userRouter);
app.use("/api/auth", authRouter);
app.use("/api/roles", roleRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/public/menus", publicMenuRouter);

app.use(tenantMiddleware);

app.use("/api/menus", menuRouter);
app.use("/api/images", imageRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/items", itemRouter);


async function initServer() {
    try {
        await initDatabase();
        await enableStrictMode();    
        await loadSchemaLimits([
        "users",
        "payments",
        "roles"
        ]);

        setupAssociations();
        
        app.listen(port, () => {
            console.log(`⚡️[servidor]: Servidor corriendo en http://localhost:${port}`);
        });
    } catch (error) {
        console.error(`⚡️[servidor]: Error al iniciar el servidor: ${error}`);
    }
}
app.use(errorHandler);


initServer(); 
