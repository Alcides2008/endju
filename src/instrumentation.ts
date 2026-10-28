import type { Instrumentation } from "next";

/**
 * Erros do servidor num formato que se pesquisa nos logs da Vercel (rota, método, mensagem).
 * Os cabeçalhos ficam de fora: levam cookies de sessão.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const err = error as Error & { digest?: string };
  console.error(
    JSON.stringify({
      level: "error",
      at: new Date().toISOString(),
      method: request.method,
      path: request.path,
      route: context.routePath,
      type: context.routeType,
      message: err.message,
      digest: err.digest,
      stack: err.stack?.split("\n").slice(0, 6).join("\n"),
    }),
  );
};
