import { LadybugLoader } from "@/components/ui/LadybugLoader";

// Aparece al instante al cambiar de módulo (Next la precarga con los links) mientras llegan los datos.
export default function Loading() {
  return (
    <div className="lb-fade-in flex min-h-[60dvh] items-center justify-center px-4" aria-busy="true">
      <LadybugLoader />
    </div>
  );
}
