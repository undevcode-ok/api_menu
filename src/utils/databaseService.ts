import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import { logger } from './logger';

dotenv.config();

const sequelize = new Sequelize({
    dialect: 'mysql',
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT!),
    username: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
    logging: false
});

export const initDatabase = async () => {
    const startedAt = Date.now();
    logger.info('Database initialization started', {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        database: process.env.DB_NAME,
    });
    try {
        await sequelize.authenticate();
        logger.info('Database connection established', {
            durationMs: Date.now() - startedAt,
        });
        await sequelize.sync({});
        logger.info('Database schema synchronization completed', {
            durationMs: Date.now() - startedAt,
        });
    } catch (error) {
        logger.error('Database initialization failed', {
            durationMs: Date.now() - startedAt,
            error,
        });
        throw error;
    }
};

export default sequelize; 
