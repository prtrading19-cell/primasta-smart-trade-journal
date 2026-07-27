interface LoadingSkeletonProps {
  rows?: number;
  className?: string;
}

export function LoadingSkeleton({ rows = 3, className = "" }: LoadingSkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 w-1/3 animate-pulse rounded bg-surface-panel" />
          <div className="h-8 w-full animate-pulse rounded bg-surface-panel" />
        </div>
      ))}
    </div>
  );
}
