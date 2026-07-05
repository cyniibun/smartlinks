export function Background({ artworkUrl }: { artworkUrl: string }) {
  return <div className="page-background" aria-hidden="true">
    <div className="background-art" style={{ backgroundImage: `url(${artworkUrl})` }} />
    <div className="background-wash" />
    <div className="background-grain" />
  </div>;
}
