export default function DashboardLoading() {
  return <main className="admin-main skeleton-page" aria-busy="true">
    <div className="admin-title-row">
      <div><span className="skeleton skeleton-kicker" /><span className="skeleton skeleton-title" /><span className="skeleton skeleton-line short" /></div>
      <span className="skeleton skeleton-button" />
    </div>
    <div className="overview-card-grid">{Array.from({ length: 6 }).map((_, index) => <div className="skeleton-card" key={index}><span className="skeleton skeleton-line short" /><span className="skeleton skeleton-number" /></div>)}</div>
    <section className="admin-panel skeleton-table">{Array.from({ length: 6 }).map((_, index) => <div className="skeleton-row" key={index}><span className="skeleton skeleton-avatar" /><span className="skeleton skeleton-line" /><span className="skeleton skeleton-line short" /></div>)}</section>
  </main>;
}
