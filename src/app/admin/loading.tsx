import { Skeleton } from "@/components/ui/skeleton";

// Suspense de cada página do painel: ao navegar, o esqueleto aparece logo enquanto os dados chegam
export default function AdminLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-5 w-full max-w-lg" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
