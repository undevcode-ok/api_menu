import { DataTypes, QueryInterface } from "sequelize";

/** Additive and idempotent: existing menus keep ordering disabled until configured. */
export async function addMenuWhatsAppPhone(queryInterface: QueryInterface) {
  const columns = await queryInterface.describeTable("menus");
  if (columns.whatsappPhone) return;

  try {
    await queryInterface.addColumn("menus", "whatsappPhone", {
      type: DataTypes.STRING(15),
      allowNull: true,
      defaultValue: null,
    });
  } catch (error) {
    // Another application instance may have performed the same migration.
    if ((error as { original?: { code?: string } }).original?.code !== "ER_DUP_FIELDNAME") {
      throw error;
    }
  }
}
