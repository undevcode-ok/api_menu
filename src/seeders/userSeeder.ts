// seeders/seedUser.ts
import { User } from "../models/User";

const seedUser = async () => {
  await User.bulkCreate(
    [
      {
        name: "Ana",
        lastName: "García",
        email: "ana.garcia@example.com",
        cel: "1123456780",
        roleId: 1,
        active: true,
        password: "AnaClave1", // 9 chars
        subdomain: "amax",
      },
      {
        name: "Bruno",
        lastName: "Martínez",
        email: "bruno.martinez@example.com",
        cel: "1123456781",
        roleId: 2,
        active: true,
        password: "Bruno1234", // 9 chars
        subdomain: "amaxito",
      },
      {
        name: "Carla",
        lastName: "López",
        email: "carla.lopez@example.com",
        cel: "1123456782",
        roleId: 3,
        active: true,
        password: "Carla2024", // 9 chars
        subdomain: "amaxlote",
      },
      {
        name: "Diego",
        lastName: "Suárez",
        email: "diego.suarez@example.com",
        cel: "1123456783",
        roleId: 3,
        active: true,
        password: "Diego0008", // 9 chars
        subdomain: "amaxlequeano",
      },
      {
        name: "Elena",
        lastName: "Torres",
        email: "elena.torres@example.com",
        cel: "1123456784",
        roleId: 2,
        active: true,
        password: "Elena8899", // 9 chars}
        subdomain: "amaxpito",
      },
    ],
    { individualHooks: true }
  );
};

export default seedUser;