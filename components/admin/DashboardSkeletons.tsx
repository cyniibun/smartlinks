export function DashboardTitleSkeleton({ actions = false }: { actions?: boolean }) {
  return <div className="admin-title-row">
    <div><span className="skeleton skeleton-kicker" /><span className="skeleton skeleton-title" /><span className="skeleton skeleton-line short" /></div>
    {actions && <span className="skeleton skeleton-button" />}
  </div>;
}

export function KpiSkeletonGrid({ count = 6 }: { count?: number }) {
  return <div className="overview-card-grid">{Array.from({ length: count }).map((_, index) => <div className="skeleton-card" key={index}><span className="skeleton skeleton-line short" /><span className="skeleton skeleton-number" /></div>)}</div>;
}

export function TableSkeleton({ rows = 6, image = false }: { rows?: number; image?: boolean }) {
  return <section className="admin-panel skeleton-table">{Array.from({ length: rows }).map((_, index) => <div className="skeleton-row" key={index}>{image && <span className="skeleton skeleton-avatar" />}<span className="skeleton skeleton-line" /><span className="skeleton skeleton-line short" /></div>)}</section>;
}

export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return <section className="admin-panel"><div className="editor-grid">{Array.from({ length: fields }).map((_, index) => <span className="skeleton skeleton-input" key={index} />)}</div><span className="skeleton skeleton-button" style={{ marginTop: 18 }} /></section>;
}
