// Helpers SHA-256 compatibles avec le hash stocké côté campagnes :
// 'sha256:' + hex( SHA256( matricule + ':' + motDePasse ) ).
export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(String(text));
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function isSha256Hex(s: string): boolean {
  return /^[0-9a-f]{64}$/i.test(String(s || '').trim());
}

export async function passwordHash(matricule: string, pw: string): Promise<string> {
  const h = await sha256Hex(`${String(matricule || '').trim()}:${String(pw || '')}`);
  return `sha256:${h}`;
}

/** Vérifie un mot de passe contre le hash stocké (hashé ou legacy en clair). */
export async function passwordMatches(
  matricule: string,
  inputPw: string,
  storedPw: string,
): Promise<boolean> {
  const stored = String(storedPw || '').trim();
  if (!stored) return false;
  if (stored.startsWith('sha256:')) {
    return (await passwordHash(matricule, inputPw)) === stored;
  }
  if (isSha256Hex(stored)) {
    const h = await sha256Hex(`${String(matricule || '').trim()}:${String(inputPw || '')}`);
    return h === stored.toLowerCase();
  }
  return stored === String(inputPw || '').trim();
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
