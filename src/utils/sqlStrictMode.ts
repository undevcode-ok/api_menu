import sequelize from "../utils/databaseService";

export async function enableStrictMode() {
  // Lee el sql_mode actual y agrega STRICT_TRANS_TABLES si falta
  const [[row]]: any = await sequelize.query("SELECT @@SESSION.sql_mode AS mode");
  const current: string = row.mode || "";
  if (!current.includes("STRICT_TRANS_TABLES")) {
    const updated = current.length ? `${current},STRICT_TRANS_TABLES` : "STRICT_TRANS_TABLES";
    await sequelize.query(`SET SESSION sql_mode = '${updated}'`);
  }
}