import { fetchStudentPhotosByIds } from "@/integrations/supabase/students";

// Cache + carregamento em lote das fotos (base64) dos alunos.
// As listas passam a não baixar a foto; as miniaturas pedem a foto sob demanda
// por aqui, agrupando vários ids em poucas requisições.

const cache = new Map<string, string | null>();
let queue = new Set<string>();
const waiters = new Map<string, Array<(v: string | null) => void>>();
let timer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  timer = null;
  const ids = Array.from(queue);
  queue = new Set();
  if (ids.length === 0) return;

  // Agrupa em blocos para não estourar o tamanho da URL/consulta.
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    let photos: Record<string, string | null> = {};
    try {
      photos = await fetchStudentPhotosByIds(chunk);
    } catch {
      photos = {};
    }
    for (const id of chunk) {
      const val = photos[id] ?? null;
      cache.set(id, val);
      const ws = waiters.get(id);
      if (ws) {
        ws.forEach((w) => w(val));
        waiters.delete(id);
      }
    }
  }
}

export function getStudentPhoto(id: string): Promise<string | null> {
  if (cache.has(id)) return Promise.resolve(cache.get(id) ?? null);
  return new Promise((resolve) => {
    const arr = waiters.get(id) || [];
    arr.push(resolve);
    waiters.set(id, arr);
    queue.add(id);
    if (!timer) timer = setTimeout(flush, 60);
  });
}

// Quando a foto já veio junto (ex.: Modo B), alimenta o cache para evitar refetch.
export function primeStudentPhoto(id: string, photo: string | null | undefined) {
  if (photo !== undefined) cache.set(id, photo ?? null);
}
