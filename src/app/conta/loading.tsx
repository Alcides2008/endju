import { Skeleton } from "@/components/ui/skeleton";

// Suspense de cada página da conta: ao mudar de página, a navegação mostra isto logo enquanto os dados chegam
export default function AccountLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-5 w-full max-w-lg" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
