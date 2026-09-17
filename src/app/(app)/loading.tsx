// Esqueleto que aparece al instante mientras carga la pantalla (y que Next precarga en los links).
export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-6 px-4 pt-6" aria-busy="true" aria-label="Cargando">
      <div className="flex flex-col gap-2">
        <div className="h-3 w-24 rounded-full bg-line" />
        <div className="h-7 w-2/3 rounded-full bg-line" />
      </div>
      <div className="flex gap-2">
        <div className="h-11 w-28 rounded-card bg-surface shadow-soft" />
        <div className="h-11 w-24 rounded-card bg-surface shadow-soft" />
        <div className="h-11 w-32 rounded-card bg-surface shadow-soft" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="lb-card flex flex-col gap-3">
          <div className="h-3 w-32 rounded-full bg-line" />
          <div className="h-4 w-full rounded-full bg-line/70" />
          <div className="h-4 w-5/6 rounded-full bg-line/70" />
          <div className="h-4 w-2/3 rounded-full bg-line/70" />
        </div>
      ))}
    </div>
  );
}
