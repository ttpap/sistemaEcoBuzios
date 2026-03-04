export async function imageFileToCompressedDataUrl(
  file: File,
  opts?: {
    maxSide?: number;
    quality?: number; // only for JPEG
    outputType?: "image/jpeg" | "image/png";
  },
): Promise<string> {
  const maxSide = opts?.maxSide ?? 1024;

  const outType: "image/jpeg" | "image/png" =
    opts?.outputType ?? (file.type === "image/png" ? "image/png" : "image/jpeg");

  const quality = outType === "image/jpeg" ? (opts?.quality ?? 0.82) : undefined;

  // iPhone costuma gerar HEIC/HEIF — convertemos para JPEG no browser antes de comprimir.
  const normalizedFile = await normalizeHeicIfNeeded(file);

  const { source, width, height, cleanup } = await loadImageSource(normalizedFile);

  try {
    const largest = Math.max(width, height);
    const scale = largest > maxSide ? maxSide / largest : 1;

    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas não suportado");

    // Draw
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ctx.drawImage(source as any, 0, 0, targetW, targetH);

    // Export
    return canvas.toDataURL(outType, quality as any);
  } finally {
    cleanup?.();
  }
}

function isHeicFile(file: File) {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return (
    type.includes("heic") ||
    type.includes("heif") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

async function normalizeHeicIfNeeded(file: File): Promise<File> {
  if (!isHeicFile(file)) return file;

  // heic2any converte HEIC/HEIF para JPEG no client.
  const mod = await import("heic2any");
  const heic2any = (mod as any).default || (mod as any);

  const outBlob = (await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.9,
  })) as Blob;

  const nextName = (file.name || "foto")
    .replace(/\.(heic|heif)$/i, ".jpg")
    .replace(/\s+/g, " ")
    .trim();

  return new File([outBlob], nextName || "foto.jpg", {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

async function loadImageSource(file: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup?: () => void;
}> {
  // Prefer createImageBitmap when available (faster, avoids img decode edge-cases).
  if (typeof createImageBitmap === "function") {
    const bmp = await createImageBitmap(file);
    return {
      source: bmp,
      width: bmp.width,
      height: bmp.height,
      cleanup: () => bmp.close(),
    };
  }

  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Falha ao ler imagem"));
    el.src = url;
  });

  return {
    source: img,
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height,
    cleanup: () => URL.revokeObjectURL(url),
  };
}