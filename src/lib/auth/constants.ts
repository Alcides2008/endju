/** Partilhado entre o proxy, os Route Handlers e os layouts protegidos. */
export const SESSION_COOKIE = "__session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 dias (máximo do Firebase)
/** Só se cria sessão a partir de um login feito há menos de 5 min (token roubado antigo não serve). */
export const RECENT_SIGN_IN_SECONDS = 5 * 60;
