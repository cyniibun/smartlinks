import { DashboardTitleSkeleton, TableSkeleton } from "@/components/admin/DashboardSkeletons";

export default function ArtistsLoading() {
  return <main className="admin-main skeleton-page" aria-busy="true">
    <DashboardTitleSkeleton />
    <TableSkeleton rows={6} />
  </main>;
}
