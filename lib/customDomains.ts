export type WorkspaceDomainStatus = "Pending" | "Verified" | "SSL Pending" | "Active" | "Disabled";

export type WorkspaceDomain = {
  id: string;
  workspace_id: string;
  hostname: string;
  status: WorkspaceDomainStatus;
  verified: boolean;
  ssl_status: string | null;
  verification_token: string;
  verification_method: string;
  created_at?: string;
  updated_at?: string;
};

export function normalizeHostname(value: string) {
  const raw = value.trim().toLowerCase();
  const withoutProtocol = raw.replace(/^https?:\/\//, "");
  const hostname = withoutProtocol.split("/")[0]?.replace(/\.$/, "") || "";
  if (!hostname || hostname.includes("*") || hostname.includes("_")) throw new Error("Enter a valid hostname, such as listen.artist.com.");
  if (hostname.length > 253) throw new Error("Hostname is too long.");
  const labels = hostname.split(".");
  if (labels.length < 2) throw new Error("Enter a full hostname, such as listen.artist.com.");
  for (const label of labels) {
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) throw new Error("Hostname contains an invalid label.");
  }
  return hostname;
}

export function domainVerificationHost(hostname: string) {
  return `_tonelink-verification.${normalizeHostname(hostname)}`;
}

export function displayVerificationHost() {
  return "_tonelink-verification";
}

export function domainCnameHost(hostname: string) {
  return normalizeHostname(hostname).split(".")[0] || "@";
}

export function cnameTarget() {
  return "link.tone-link.com";
}
