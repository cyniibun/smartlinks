"use client";

export function AsyncError({ message, detail, onRetry }: { message: string; detail?: string; onRetry?: () => void }) {
  return <div className="admin-alert error async-error">
    <div><strong>{message}</strong>{onRetry && <button type="button" onClick={onRetry}>Retry</button>}</div>
    {detail && <details><summary>Technical detail</summary><pre>{detail}</pre></details>}
  </div>;
}

