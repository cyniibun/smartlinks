import type { IconType } from "react-icons";
import { FaAmazon, FaApple, FaDeezer, FaSoundcloud, FaSpotify, FaYoutube } from "react-icons/fa";
import { SiPandora, SiTidal } from "react-icons/si";
import type { PlatformType } from "@/data/songs";

const icons: Partial<Record<PlatformType, IconType>> = {
  spotify: FaSpotify, apple_music: FaApple, itunes: FaApple,
  youtube: FaYoutube, youtube_music: FaYoutube, soundcloud: FaSoundcloud,
  pandora: SiPandora, deezer: FaDeezer, amazon_music: FaAmazon,
  amazon: FaAmazon, tidal: SiTidal
};

export function PlatformIcon({ platform, label }: { platform: PlatformType; label: string }) {
  const Icon = icons[platform];
  return Icon ? <Icon aria-hidden="true" /> : <span aria-hidden="true">{label.charAt(0)}</span>;
}
