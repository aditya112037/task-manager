const GENERIC_TEAM_ICONS = new Set(["👥", "👤", "T", "TEAM"]);

const TEAM_GRADIENTS = [
  "linear-gradient(135deg, #0ea5e9, #2563eb)",
  "linear-gradient(135deg, #06b6d4, #0f766e)",
  "linear-gradient(135deg, #10b981, #15803d)",
  "linear-gradient(135deg, #f59e0b, #d97706)",
  "linear-gradient(135deg, #f43f5e, #be123c)",
  "linear-gradient(135deg, #a855f7, #6d28d9)",
  "linear-gradient(135deg, #14b8a6, #0f766e)",
  "linear-gradient(135deg, #3b82f6, #1d4ed8)",
];

const hashString = (value = "") => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const getTeamInitials = (name = "") => {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "TM";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
};

export const getTeamAvatarLabel = (team) => {
  const icon = String(team?.icon || "").trim();
  if (icon && !GENERIC_TEAM_ICONS.has(icon.toUpperCase())) {
    return icon;
  }
  return getTeamInitials(team?.name);
};

export const getTeamAvatarSx = (team, fallbackColor = "#1d4ed8") => {
  const seed = `${team?._id || ""}-${team?.name || ""}`;
  const index = hashString(seed) % TEAM_GRADIENTS.length;
  const gradient = TEAM_GRADIENTS[index];
  const tint = team?.color || fallbackColor;

  return {
    backgroundImage: `${gradient}, linear-gradient(180deg, ${tint}, ${tint})`,
    backgroundBlendMode: "overlay, normal",
    color: "#fff",
    fontWeight: 800,
    letterSpacing: 0.4,
    boxShadow: "0 10px 22px rgba(0,0,0,0.22)",
    border: "2px solid rgba(255,255,255,0.72)",
  };
};

