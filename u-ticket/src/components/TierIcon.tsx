import DiamondOutlinedIcon from "@mui/icons-material/DiamondOutlined";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import type { TierName } from "@/lib/types";

const ICONS = {
  Diamond: DiamondOutlinedIcon,
  Gold: WorkspacePremiumIcon,
  Silver: MilitaryTechIcon,
  General: ConfirmationNumberOutlinedIcon,
} satisfies Record<TierName, unknown>;

export default function TierIcon({ tier, className }: { tier: TierName; className?: string }) {
  const Icon = ICONS[tier];
  return <Icon fontSize="inherit" className={className} aria-hidden />;
}
