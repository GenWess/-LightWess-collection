/** Traduit les messages d'erreur de Supabase Auth. */
export function frAuthError(m: string): string {
  if (/invalid login credentials/i.test(m)) return "E-mail ou mot de passe incorrect.";
  if (/already registered|already been registered/i.test(m)) return "Un compte existe déjà avec cet e-mail.";
  if (/email not confirmed/i.test(m)) return "Confirme d'abord ton e-mail (regarde ta boîte mail).";
  if (/password should be at least/i.test(m)) return "Mot de passe trop court.";
  if (/rate limit|too many/i.test(m)) return "Trop d'essais. Réessaie dans quelques minutes.";
  if (/invalid email|unable to validate email/i.test(m)) return "Adresse e-mail invalide.";
  return m;
}
