// Pantallas públicas (entrar, recuperar la contraseña, pagar una división): sin barra ni header de la app.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh w-full flex-1 flex-col">{children}</div>;
}
