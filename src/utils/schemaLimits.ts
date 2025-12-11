import sequelize from "../utils/databaseService";

type LimitsMap = Record<string, Record<string, number>>;
// Estructura: { tableName: { columnName: maxLen, ... }, ... }
const limitsByTable: LimitsMap = {};

function parseLengthFromType(dbType: string): number | undefined {
  // Ejemplos: "varchar(255)", "char(36)". Para TEXT no devuelve nada.
  const m = /\b(?:var)?char\((\d+)\)/i.exec(dbType);
  return m ? parseInt(m[1], 10) : undefined;
}

export async function loadSchemaLimits(tables: string[]) {
  const qi = sequelize.getQueryInterface();
  for (const table of tables) {
    const desc = await qi.describeTable(table); // { col: { type: 'varchar(255)', ... } }
    const perColumn: Record<string, number> = {};
    for (const [col, meta] of Object.entries(desc)) {
      const rawType = (meta as any).type as string; // p.ej. 'VARCHAR(255)'
      const len = parseLengthFromType(rawType || "");
      if (typeof len === "number") {
        perColumn[col] = len;
      }
    }
    limitsByTable[table] = perColumn;
  }
}

export function getMaxLen(table: string, column: string): number | undefined {
  return limitsByTable[table]?.[column];
}

export function getTableLimits(table: string): Record<string, number> {
  return limitsByTable[table] || {};
}