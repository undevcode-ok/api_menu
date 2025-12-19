import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

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
    try {
        await sequelize.authenticate();
        console.log('Conexión a la base de datos establecida correctamente.');
        await sequelize.sync({});
    } catch (error) {
        console.error('Error al conectar con la base de datos:', error);
        throw error;
    }
};

export default sequelize; 
