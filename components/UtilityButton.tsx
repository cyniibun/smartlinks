import type { IconType } from "react-icons";

export function UtilityButton({ label, icon: Icon, onClick }: { label: string; icon: IconType; onClick: () => void }) {
  return <button className="utility-button" type="button" onClick={onClick}>
    <Icon aria-hidden="true" /><span>{label}</span>
  </button>;
}
