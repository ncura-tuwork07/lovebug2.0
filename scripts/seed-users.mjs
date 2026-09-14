// Crea (o actualiza la contraseña de) los dos usuarios de Lovebug en Supabase Auth.
//
// Uso:
//   1. Completá NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local
//      (la service role key está en Supabase → Project Settings → API → service_role).
//   2. Agregá SEED_PASSWORD=tu-contraseña a .env.local (es local y ya está en .gitignore).
//   3. Corré: npm run seed:users
//
// SUPABASE_SERVICE_ROLE_KEY y SEED_PASSWORD nunca deben commitearse ni usarse en el
// cliente — solo se usan acá, de forma local, para crear las cuentas una vez.

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.SEED_PASSWORD;

if (!url || !serviceRoleKey || !password) {
  console.error(
    "Faltan variables en .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y/o SEED_PASSWORD."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const users = [
  { email: "nazacura95@gmail.com", name: "Nazareno" },
  { email: "jazmin.sorrentino2020@gmail.com", name: "Jazmín" },
];

for (const u of users) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: u.email,
    password,
    email_confirm: true,
    user_metadata: { name: u.name },
  });

  if (error?.code === "email_exists") {
    const { data: list } = await supabase.auth.admin.listUsers();
    const existing = list.users.find((x) => x.email === u.email);
    if (existing) {
      await supabase.auth.admin.updateUserById(existing.id, { password });
      console.log(`Ya existía ${u.email}: contraseña actualizada.`);
    }
    continue;
  }

  if (error) {
    console.error(`Error creando ${u.email}:`, error.message);
    continue;
  }

  console.log(`Usuario creado: ${u.email} (${data.user.id})`);
}
