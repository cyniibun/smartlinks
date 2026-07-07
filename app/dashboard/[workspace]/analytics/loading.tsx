export default function AnalyticsLoading() {
  return <main className="admin-main skeleton-page" aria-busy="true">
    <div className="admin-title-row"><div><span className="skeleton skeleton-kicker" /><span className="skeleton skeleton-title" /><span className="skeleton skeleton-line short" /></div></div>
    <section className="admin-panel analytics-filters">{Array.from({ length: 8 }).map((_, index) => <span className="skeleton skeleton-input" key={index} />)}</section>
    <div className="stat-grid">{Array.from({ length: 3 }).map((_, index) => <article key={index}><span className="skeleton skeleton-line short" /><span className="skeleton skeleton-number" /></article>)}</div>
    <div className="analytics-grid">{Array.from({ length: 4 }).map((_, index) => <section className="admin-panel metric-panel" key={index}><span className="skeleton skeleton-line short" /><span className="skeleton skeleton-chart" /></section>)}</div>
  </main>;
}
