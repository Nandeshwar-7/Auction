export function formatLakhs(valueLakhs: number) {
  if (valueLakhs >= 100) {
    const crores = valueLakhs / 100;
    const formatted = Number.isInteger(crores) ? crores.toString() : crores.toFixed(1);

    return `${formatted} Cr`;
  }

  return `${valueLakhs} L`;
}

export function getPlayerInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
