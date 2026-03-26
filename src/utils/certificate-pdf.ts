import jsPDF from "jspdf";
import type { CertificateConfig } from "@/types/certificate";

// A4 landscape: 297 x 210 mm
const PAGE_W = 297;
const PAGE_H = 210;

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [isNaN(r) ? 201 : r, isNaN(g) ? 168 : g, isNaN(b) ? 76 : b];
}

function loadImageAsDataUrl(src: string): Promise<string | null> {
  if (!src) return Promise.resolve(null);
  // já é data URL — retorna direto
  if (src.startsWith("data:")) return Promise.resolve(src);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function getImageFormat(dataUrl: string): "JPEG" | "PNG" {
  if (dataUrl.includes("image/jpeg") || dataUrl.includes("image/jpg")) return "JPEG";
  return "PNG";
}

function drawBorder(doc: jsPDF, color: [number, number, number], style: string) {
  const inset = 8;
  const x = inset;
  const y = inset;
  const w = PAGE_W - inset * 2;
  const h = PAGE_H - inset * 2;

  doc.setDrawColor(...color);

  if (style === "double") {
    doc.setLineWidth(1.2);
    doc.rect(x, y, w, h);
    doc.setLineWidth(0.4);
    doc.rect(x + 3, y + 3, w - 6, h - 6);
  } else {
    doc.setLineWidth(2.0);
    doc.rect(x, y, w, h);
    doc.setLineWidth(0.5);
    doc.rect(x + 3, y + 3, w - 6, h - 6);
  }
}

async function addLogo(
  doc: jsPDF,
  src: string,
  centerX: number,
  topY: number,
  maxW: number,
  maxH: number,
): Promise<number> {
  const dataUrl = await loadImageAsDataUrl(src);
  if (!dataUrl) return topY;

  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((res) => {
    if (img.complete) res();
    else img.onload = () => res();
  });

  const nw = img.naturalWidth || img.width || 1;
  const nh = img.naturalHeight || img.height || 1;
  const ratio = nw / nh;

  let drawW = maxW;
  let drawH = drawW / ratio;
  if (drawH > maxH) {
    drawH = maxH;
    drawW = drawH * ratio;
  }

  const x = centerX - drawW / 2;
  doc.addImage(dataUrl, getImageFormat(dataUrl), x, topY, drawW, drawH);
  return topY + drawH;
}

export async function generateCertificatePdf(
  config: CertificateConfig,
  students: { fullName: string; socialName?: string }[],
  emitData: { customText: string; periodStart: string; periodEnd: string; workload: string },
  projectName: string,
): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const fontFamily = config.font_family || "times";
  const fontSize = config.font_size || 14;
  const borderColor = hexToRgb(config.border_color || "#C9A84C");
  const centerX = PAGE_W / 2;

  // Pré-carrega logos e assinaturas
  const [logoTopUrl, logoBottomUrl] = await Promise.all([
    loadImageAsDataUrl(config.logo_top),
    loadImageAsDataUrl(config.logo_bottom),
  ]);

  const sigUrls = await Promise.all(
    config.signatures.slice(0, config.signatures_count).map((s) =>
      loadImageAsDataUrl(s.image),
    ),
  );

  for (let i = 0; i < students.length; i++) {
    if (i > 0) doc.addPage();

    const student = students[i];
    const studentName = student.socialName
      ? `${student.fullName} (${student.socialName})`
      : student.fullName;

    // Borda
    drawBorder(doc, borderColor, config.border_style);

    let cursorY = 16;

    // Logo do topo
    if (logoTopUrl) {
      cursorY = await addLogo(doc, logoTopUrl, centerX, cursorY, 55, 38);
      cursorY += 6;
    } else {
      cursorY = 30;
    }

    // Texto do certificado — ** marca o lugar do nome do aluno
    const rawText = emitData.customText || "";
    const fullText = rawText
      .replace(/\*\*/g, "[[NOME]]");

    const parts = fullText.split("[[NOME]]");

    doc.setTextColor(30, 30, 30);

    const textLeft = 18;
    const textRight = PAGE_W - 18;
    const maxWidth = textRight - textLeft;
    const lineHeight = fontSize * 0.5;

    doc.setFont(fontFamily, "normal");
    doc.setFontSize(fontSize);

    // Renderiza o texto com nome em negrito/sublinhado
    // Monta linhas manualmente para posicionar o nome
    const beforeName = parts[0] ?? "";
    const afterName = parts[1] ?? "";

    // Usa splitTextToSize para calcular linhas
    const linesBefore = doc.splitTextToSize(beforeName + studentName + afterName, maxWidth);

    // Posição vertical do texto
    const totalTextH = linesBefore.length * lineHeight;
    const sigSectionStart = PAGE_H - 52;
    const availH = sigSectionStart - cursorY - 4;
    const textY = cursorY + Math.max(0, (availH - totalTextH) / 2);

    // Renderiza linha a linha, detectando onde está o nome
    let charCount = 0;
    const nameLower = studentName.toLowerCase();
    const fullFlat = (beforeName + studentName + afterName).toLowerCase();

    for (let li = 0; li < linesBefore.length; li++) {
      const line: string = linesBefore[li];
      const lineY = textY + li * lineHeight;
      const lineStart = charCount;
      const lineEnd = lineStart + line.length;

      // Índices do nome no texto completo
      const nameStart = beforeName.length;
      const nameEnd = nameStart + studentName.length;

      if (lineEnd <= nameStart || lineStart >= nameEnd) {
        // Linha sem nome
        doc.setFont(fontFamily, "normal");
        doc.text(line, centerX, lineY, { align: "center" });
      } else {
        // Linha que contém (parte do) nome — renderiza em duas/três partes
        const relStart = Math.max(0, nameStart - lineStart);
        const relEnd = Math.min(line.length, nameEnd - lineStart);

        const before = line.substring(0, relStart);
        const namePart = line.substring(relStart, relEnd);
        const after = line.substring(relEnd);

        doc.setFont(fontFamily, "normal");
        const beforeW = before ? doc.getTextWidth(before) : 0;

        doc.setFont(fontFamily, "bold");
        const nameW = doc.getTextWidth(namePart);

        doc.setFont(fontFamily, "normal");
        const afterW = after ? doc.getTextWidth(after) : 0;

        const totalW = beforeW + nameW + afterW;
        let startX = centerX - totalW / 2;

        if (before) {
          doc.setFont(fontFamily, "normal");
          doc.text(before, startX, lineY);
          startX += beforeW;
        }

        if (namePart) {
          doc.setFont(fontFamily, "bold");
          doc.text(namePart, startX, lineY);
          // Sublinhado
          const underY = lineY + 0.8;
          doc.setDrawColor(30, 30, 30);
          doc.setLineWidth(0.3);
          doc.line(startX, underY, startX + nameW, underY);
          startX += nameW;
        }

        if (after) {
          doc.setFont(fontFamily, "normal");
          doc.text(after, startX, lineY);
        }
      }

      charCount += line.length + 1; // +1 por espaço/quebra
    }

    // Seção de assinaturas
    const sigs = config.signatures.slice(0, config.signatures_count);
    const sigCount = sigs.length;

    if (sigCount > 0) {
      const sigAreaLeft = 18;
      const sigAreaRight = PAGE_W - 18;
      const sigAreaW = sigAreaRight - sigAreaLeft;
      const colW = sigAreaW / sigCount;
      const sigImageH = 14;
      const sigImageW = 28;
      const sigTop = PAGE_H - 58;

      for (let si = 0; si < sigCount; si++) {
        const colCenterX = sigAreaLeft + colW * si + colW / 2;
        const sigDataUrl = sigUrls[si];

        if (sigDataUrl) {
          await addLogo(doc, sigDataUrl, colCenterX, sigTop, sigImageW, sigImageH);
        }

        // Linha separadora da assinatura
        const lineY2 = sigTop + sigImageH + 2;
        doc.setDrawColor(80, 80, 80);
        doc.setLineWidth(0.3);
        doc.line(colCenterX - colW * 0.38, lineY2, colCenterX + colW * 0.38, lineY2);

        // Nome
        doc.setFont(fontFamily, "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(30, 30, 30);
        const sigName = sigs[si].name || "";
        doc.text(sigName, colCenterX, lineY2 + 5, { align: "center" });

        // Cargo
        doc.setFont(fontFamily, "italic");
        doc.setFontSize(7.5);
        doc.setTextColor(80, 80, 80);
        const sigTitle = sigs[si].title || "";
        doc.text(sigTitle, colCenterX, lineY2 + 9.5, { align: "center" });
      }
    }

    // Logo rodapé — posicionado acima da borda interna (y=11+h-6=199), abaixo das assinaturas
    // Borda interna inferior: PAGE_H - 8 - 3 = 199. Logo cabe de 184 a 197.
    if (logoBottomUrl) {
      await addLogo(doc, logoBottomUrl, centerX, 184, 36, 13);
    }
  }

  const filename =
    students.length === 1
      ? `certificado_${(students[0].socialName || students[0].fullName).replace(/\s+/g, "_")}.pdf`
      : `certificados_${projectName.replace(/\s+/g, "_")}.pdf`;

  doc.save(filename);
}
