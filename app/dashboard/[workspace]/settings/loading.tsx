import { DashboardTitleSkeleton, FormSkeleton } from "@/components/admin/DashboardSkeletons";

export default function SettingsLoading() {
  return <main className="admin-main skeleton-page" aria-busy="true">
    <DashboardTitleSkeleton />
    <div className="settings-layout"><aside>{Array.from({ length: 7 }).map((_, index) => <span className="skeleton skeleton-input" key={index} />)}</aside><FormSkeleton fields={8} /></div>
  </main>;
}
