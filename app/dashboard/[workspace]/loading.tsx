import { DashboardTitleSkeleton, KpiSkeletonGrid, TableSkeleton } from "@/components/admin/DashboardSkeletons";

export default function WorkspaceRouteLoading() {
  return <main className="admin-main skeleton-page" aria-busy="true">
    <DashboardTitleSkeleton actions />
    <KpiSkeletonGrid />
    <TableSkeleton rows={5} image />
  </main>;
}
