import { DashboardTitleSkeleton, TableSkeleton } from "@/components/admin/DashboardSkeletons";

export default function SmartLinksLoading() {
  return <main className="admin-main skeleton-page" aria-busy="true">
    <DashboardTitleSkeleton actions />
    <TableSkeleton rows={8} image />
  </main>;
}
