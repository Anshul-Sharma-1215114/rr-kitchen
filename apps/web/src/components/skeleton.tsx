export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-spice-100 ${className}`} />;
}

export function ItemCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-spice-100 bg-white shadow-sm">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <div className="mt-auto flex items-center justify-between pt-3">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function ComboCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border-2 border-leaf-100 bg-white shadow-sm">
      <Skeleton className="h-8 w-full rounded-none" />
      <div className="flex flex-col gap-2 p-5">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <div className="mt-4 flex items-center justify-between">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function TestimonialCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-spice-100 bg-white p-5 shadow-sm">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="mt-2 h-3 w-20" />
    </div>
  );
}

export function OrderRowSkeleton() {
  return (
    <div className="rounded-xl border border-spice-100 p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="mt-2 h-3 w-3/4" />
      <div className="mt-3 flex items-center justify-between">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Skeleton className="aspect-video w-full rounded-2xl" />
      <Skeleton className="mt-4 h-6 w-1/2" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-1 h-4 w-3/4" />
      <Skeleton className="mt-6 h-16 w-full rounded-2xl" />
    </main>
  );
}
