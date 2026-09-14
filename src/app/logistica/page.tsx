import { SetupBanner } from "@/components/SetupBanner";
import { CarFront } from "lucide-react";

const demoTrips = [
  { id: 1, who: "Tomi", destination: "Club (fútbol)", time: "17:00", driver: "Naza" },
  { id: 2, who: "Sofi", destination: "Inglés", time: "18:30", driver: "Jazmín" },
  { id: 3, who: "Mati", destination: "Colegio (salida)", time: "16:15", driver: "Jazmín" },
];

export default function LogisticaPage() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-8">
      <header>
        <p className="text-sm text-rose-400">Quién lleva a quién</p>
        <h1 className="text-2xl font-semibold text-slate-900">Logística</h1>
      </header>

      <SetupBanner />

      <ul className="flex flex-col gap-3">
        {demoTrips.map((trip) => (
          <li
            key={trip.id}
            className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-rose-100"
          >
            <div className="rounded-full bg-rose-50 p-2 text-rose-500">
              <CarFront size={18} />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-700">
                {trip.who} → {trip.destination}
              </p>
              <p className="text-xs text-slate-400">Lleva: {trip.driver}</p>
            </div>
            <span className="text-sm font-semibold text-rose-500">{trip.time}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
