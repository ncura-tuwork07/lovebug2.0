import { SetupBanner } from "@/components/SetupBanner";
import { PersonChip, type PersonKey } from "@/components/ui/PersonChip";
import { CarFront } from "lucide-react";

const demoTrips: { id: number; who: string; destination: string; time: string; driver: PersonKey; now?: boolean }[] = [
  { id: 1, who: "Juana", destination: "Colegio San Martín", time: "08:00", driver: "naza" },
  { id: 2, who: "Ariana", destination: "Instituto Kensington (inglés)", time: "13:30", driver: "jaz" },
  { id: 3, who: "Salvador", destination: "Club Los Pinos · cancha 2", time: "17:00", driver: "jaz", now: true },
];

export default function LogisticaPage() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-8">
      <header>
        <p className="text-sm text-success">Quién lleva a quién</p>
        <h1 className="text-h1 font-display font-bold text-ink">Logística</h1>
      </header>

      <SetupBanner />

      <ul className="flex flex-col gap-3">
        {demoTrips.map((trip) => (
          <li
            key={trip.id}
            className={`lb-card flex items-center gap-3 !p-4 ${trip.now ? "!bg-coral-soft" : ""}`}
          >
            <div className="rounded-full bg-success/10 p-2 text-success">
              <CarFront size={18} />
            </div>
            <div className="flex-1">
              <p className="font-medium text-ink">
                {trip.who} → {trip.destination}
              </p>
              {trip.now && <p className="text-meta font-semibold text-coral">AHORA</p>}
            </div>
            <PersonChip person={trip.driver} />
            <span className="text-sm font-semibold text-success">{trip.time}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
