import { Role } from "../models/Role";

const seedRole = async () => {
  await Role.bulkCreate([
    { role: "Admin", active: true },
    { role: "Client", active: true },
    { role: "User", active: true }
  ]);
};

export default seedRole;