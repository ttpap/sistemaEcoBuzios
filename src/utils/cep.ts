export type CepLookupResult = {
  street?: string;
  neighborhood?: string;
  city?: string;
  uf?: string;
};

function cleanCep(value: string) {
  return (value || "").replace(/\D/g, "");
}

/**
 * Busca CEP e retorna dados básicos de endereço.
 * Usa BrasilAPI primeiro (geralmente com CORS ok) e ViaCEP como fallback.
 */
export async function lookupCep(cep: string): Promise<CepLookupResult | null> {
  const clean = cleanCep(cep);
  if (clean.length !== 8) return null;

  // 1) BrasilAPI
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${clean}`);
    if (res.ok) {
      const data: any = await res.json();
      return {
        street: data.street || data.logradouro || "",
        neighborhood: data.neighborhood || data.bairro || "",
        city: data.city || data.localidade || "",
        uf: data.state || data.uf || "",
      };
    }
  } catch {
    // ignore
  }

  // 2) ViaCEP (fallback)
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (res.ok) {
      const data: any = await res.json();
      if (!data?.erro) {
        return {
          street: data.logradouro || "",
          neighborhood: data.bairro || "",
          city: data.localidade || "",
          uf: data.uf || "",
        };
      }
    }
  } catch {
    // ignore
  }

  return null;
}
