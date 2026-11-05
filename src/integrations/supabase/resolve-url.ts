// Em produção o app fala com o Supabase pelo próprio domínio (rota /sb/* do
// vercel.json, que repassa para o projeto). Motivo: redes com IPv4 traduzido
// (hotspot de celular em operadora IPv6-only) cortam pacotes grandes para
// *.supabase.co, que só tem endereço IPv4; o domínio na Vercel passa normal.
// Fora do domínio (localhost, preview) continua usando a URL direta da env.
const PROXY_HOSTS = ["www.ecobuziossistema.com.br", "ecobuziossistema.com.br"];
export const SUPABASE_PROXY_PATH = "/sb";

export function resolveSupabaseUrl(envUrl: string | undefined): string | undefined {
  if (!envUrl || typeof window === "undefined") return envUrl;
  if (!PROXY_HOSTS.includes(window.location.hostname)) return envUrl;
  return `${window.location.origin}${SUPABASE_PROXY_PATH}`;
}
