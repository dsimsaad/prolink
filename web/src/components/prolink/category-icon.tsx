import {
  BrickWall,
  Hammer,
  PaintRoller,
  Settings,
  Sparkles,
  Wind,
  Wrench,
  Zap,
} from "lucide-react";
import type { CategoryIconKey } from "@/config/site";

export function CategoryIcon({
  iconKey,
  className = "h-5 w-5",
}: {
  iconKey: CategoryIconKey;
  className?: string;
}) {
  switch (iconKey) {
    case "wrench":
      return <Wrench className={className} aria-hidden="true" />;
    case "zap":
      return <Zap className={className} aria-hidden="true" />;
    case "paint-roller":
      return <PaintRoller className={className} aria-hidden="true" />;
    case "hammer":
      return <Hammer className={className} aria-hidden="true" />;
    case "wind":
      return <Wind className={className} aria-hidden="true" />;
    case "brick-wall":
      return <BrickWall className={className} aria-hidden="true" />;
    case "sparkles":
      return <Sparkles className={className} aria-hidden="true" />;
    case "settings":
      return <Settings className={className} aria-hidden="true" />;
  }
}
