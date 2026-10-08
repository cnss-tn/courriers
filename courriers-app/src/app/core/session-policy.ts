// Politique de session : journée de service 7h00 -> 19h00 (12h).
// L'expiration est ancrée sur la fin de service, pas sur l'heure de login :
// connexion à 8h00 => expire à 19h00 ; connexion à 20h00 => expire le lendemain à 19h00.
export const SERVICE_START_HOUR = 7;
export const SERVICE_END_HOUR = 19;

export function computeSessionExpiry(from: number = Date.now()): number {
  const end = new Date(from);
  end.setHours(SERVICE_END_HOUR, 0, 0, 0);
  if (end.getTime() <= from) end.setDate(end.getDate() + 1);
  return end.getTime();
}
