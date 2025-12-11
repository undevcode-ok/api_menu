import sequelize from "../utils/databaseService";
import seedRoles from "./roleSeeder";
import seedUsers from "./userSeeder";

import seedMenus from "./menuSeeder";
import seedCategories from "./categorySeeder";
import seedImages from "./imageSeeder";
import seedItems from "./itemSeeder";

const seed = async () => {
  let exitCode = 0;

  try {
    console.log("🔄 Desactivando FOREIGN_KEY_CHECKS y sincronizando esquemas...");

    // Desactivar validación de claves foráneas para poder dropear en cualquier orden
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 0;");

    // Limpia y vuelve a crear las tablas según los modelos
    await sequelize.sync({ force: true });

    // Volver a activar las claves foráneas
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 1;");

    console.log("✅ Tablas recreadas. Ejecutando seeders...");

    // Orden recomendado por FK
    await seedRoles();
    await seedUsers();

    await seedMenus();
    await seedCategories();
    await seedImages();
    await seedItems();

    console.log("✅ Seed completado exitosamente");
  } catch (error) {
    exitCode = 1;
    console.error("❌ Error al ejecutar seed:", (error as Error).message);
  } finally {
    // Cerrar la conexión a la base antes de salir
    await sequelize.close();
    process.exit(exitCode);
  }
};

export default seed;

// Ejecutar si se llama directamente
seed();
