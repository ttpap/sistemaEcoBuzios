// Gera uma "moldura" (anel) a partir de uma textura: a textura é desenhada
// cobrindo a página A4 paisagem e o centro é apagado, deixando apenas a faixa
// das bordas. O resultado (PNG com centro transparente) é usado igual no PDF e
// na pré-visualização.

const FRAME_W = 1485; // 297mm * 5
const FRAME_H = 1050; // 210mm * 5

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * @param textureDataUrl textura (data URL ou URL)
 * @param band espessura da faixa como fração do menor lado (0–0.5). Default 0.09.
 * @returns data URL PNG da moldura (centro transparente) ou null
 */
export async function buildBorderFrame(
  textureDataUrl: string,
  band = 0.09,
): Promise<string | null> {
  if (!textureDataUrl) return null;

  const img = await loadImage(textureDataUrl);
  if (!img) return null;

  const canvas = document.createElement("canvas");
  canvas.width = FRAME_W;
  canvas.height = FRAME_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Textura cobrindo toda a página
  ctx.drawImage(img, 0, 0, FRAME_W, FRAME_H);

  // Apaga o centro, sobra só a faixa das bordas
  const t = Math.round(Math.min(FRAME_W, FRAME_H) * Math.max(0.02, Math.min(0.45, band)));
  ctx.clearRect(t, t, FRAME_W - 2 * t, FRAME_H - 2 * t);

  return canvas.toDataURL("image/png");
}
