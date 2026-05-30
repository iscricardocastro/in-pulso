import { Skeleton } from "@/components/ui/skeleton";

export default function ProductsLoading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-52" />
      <Skeleton className="h-96 w-full rounded-lg" />
    </div>
  );
}
