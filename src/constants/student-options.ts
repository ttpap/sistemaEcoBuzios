// Listas fechadas da ficha do aluno. Mantenha em sincronia com:
// - students_education_level_check (migração 0062)
// - public.normalize_bairro (migração 0063)

export const SEM_INFORMACAO = "Sem informação";

export const ESCOLARIDADES = [
  "Não alfabetizado",
  "Fundamental incompleto",
  "Fundamental completo",
  "Médio incompleto",
  "Médio completo",
  "Superior incompleto",
  "Superior completo",
] as const;

export const OUTRO_BAIRRO = "Outro bairro";

// Bairros de Armação dos Búzios (nomes iguais aos do ViaCEP quando existem).
export const BAIRROS = [
  "Alto de Búzios",
  "Armação",
  "Arpoador",
  "Baía Formosa",
  "Bosque de Geribá",
  "Brava",
  "Caminho de Búzios",
  "Capão",
  "Caravelas",
  "Cem Braças",
  "Centro",
  "Cruzeiro",
  "Ferradura",
  "Forno",
  "Geribá",
  "Golfe",
  "João Fernandes",
  "José Gonçalves",
  "Manguinhos",
  "Maria Joaquina",
  "Marina",
  "Ossos",
  "Portal da Ferradura",
  "Praia Rasa",
  "Rasa",
  "São José",
  "Tartaruga",
  "Tucuns",
  "Vila Caranga",
  "Vila Verde",
] as const;

const chave = (v: string) =>
  v.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

const BAIRRO_POR_CHAVE = new Map<string, string>(
  [...BAIRROS, OUTRO_BAIRRO].map((b) => [chave(b), b]),
);

/** Converte um bairro livre (cadastro antigo / ViaCEP) para a lista fechada. "" = não reconhecido. */
export function normalizeBairro(valor: string | null | undefined): string {
  const k = chave(valor || "");
  if (!k) return "";
  const exato = BAIRRO_POR_CHAVE.get(k);
  if (exato) return exato;
  if (k.startsWith("maria joaquina")) return "Maria Joaquina";
  if (k.startsWith("centro (")) return "Centro";
  if (k === "alto da rasa" || k === "rasa - alto da boa vista") return "Rasa";
  if (k === "outro") return OUTRO_BAIRRO;
  return "";
}

/** Bairro sugerido a partir do CEP: fora de Búzios = "Outro bairro". */
export function bairroDoCep(bairro: string | null | undefined, cidade: string | null | undefined): string {
  const c = chave(cidade || "");
  if (c && !c.includes("buzios")) return OUTRO_BAIRRO;
  return normalizeBairro(bairro);
}
