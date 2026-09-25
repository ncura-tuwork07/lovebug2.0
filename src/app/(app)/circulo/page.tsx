import { getContacts, getSessionContext } from "@/lib/data";
import { ContactsList } from "@/components/modules/ContactsList";

export const dynamic = "force-dynamic";

export default async function CirculoPage() {
  const [contacts, { household }] = await Promise.all([getContacts(), getSessionContext()]);

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <header>
        <p className="text-sm" style={{ color: "#0891B2" }}>
          Familia y amigos, fuera de casa
        </p>
        <h1 className="text-h1 font-display font-bold text-ink">Círculo</h1>
        <p className="mt-1 text-body text-ink-soft">
          Gente que no vive con ustedes pero es parte de su vida: abuelos, tíos, amigos, madrinas. Sus cumples aparecen en Vencimientos y, al
          armar un evento, aparecen como sugerencia para invitar.
        </p>
      </header>
      <ContactsList contacts={contacts} householdId={household?.id ?? ""} />
    </div>
  );
}
