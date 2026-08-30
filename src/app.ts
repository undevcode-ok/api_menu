import express from "express";
import cors from "cors";
import userRouter from "./routes/userRouter";
import authRouter from "./routes/authRouter";
import roleRouter from "./routes/roleRouter";
import paymentRouter from "./routes/paymentRouter";
import menuRouter from "./routes/menuRouter";
import imageRouter from "./routes/imageRouter";
import categoryRouter from "./routes/categoryRouter";
import itemRouter from "./routes/itemRouter";
import publicMenuRouter from "./routes/publicMenuRouter";
import { errorHandler } from "./middlewares/errorHandler";
import { httpLogger } from "./middlewares/httpLogger";
import { isAuthenticated } from "./middlewares/isAuthenticated";
import { tenantMiddleware } from "./middlewares/tenant";

const app = express();

app.use(cors({ exposedHeaders: ["x-request-id"] }));
app.use(express.json());
app.use(httpLogger);

app.use("/api/users", userRouter);
app.use("/api/auth", authRouter);
app.use("/api/roles", roleRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/public/menus", publicMenuRouter);

app.use(isAuthenticated);
app.use(tenantMiddleware);

app.use("/api/menus", menuRouter);
app.use("/api/images", imageRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/items", itemRouter);

app.use(errorHandler);

export default app;
