import jsPDF from "jspdf";
import type { MeetingMinute } from "@/services/meetingMinutesService";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;

function loadImageAsDataUrl(src: string): Promise<string | null> {
  if (!src) return Promise.resolve(null);
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
  return dataUrl.includes("image/jpeg") || dataUrl.includes("image/jpg") ? "JPEG" : "PNG";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// Quebra texto longo em linhas para o jsPDF
function splitText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth) as string[];
}

export async function generateMeetingMinutesPdf(
  minute: MeetingMinute,
  projectName: string,
  logoUrl?: string,
): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  let logoData: string | null = null;
  if (logoUrl && !logoUrl.startsWith("data:application/pdf")) {
    logoData = await loadImageAsDataUrl(logoUrl);
  }

  let y = MARGIN;

  // ── Cabeçalho ──────────────────────────────────────────
  if (logoData) {
    const fmt = getImageFormat(logoData);
    // Logo no centro, altura máxima 20mm
    const imgProps = doc.getImageProperties(logoData);
    const logoH = 20;
    const logoW = (imgProps.width / imgProps.height) * logoH;
    const logoX = (PAGE_W - logoW) / 2;
    doc.addImage(logoData, fmt, logoX, y, logoW, logoH);
    y += logoH + 4;
  }

  // Nome do projeto
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text(projectName.toUpperCase(), PAGE_W / 2, y, { align: "center" });
  y += 5;

  // Linha separadora
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;

  // Título da ata
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  const titleLines = splitText(doc, minute.title.toUpperCase(), CONTENT_W);
  doc.text(titleLines, PAGE_W / 2, y, { align: "center" });
  y += titleLines.length * 6 + 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text("ATA DE REUNIÃO", PAGE_W / 2, y, { align: "center" });
  y += 8;

  // ── Bloco de metadados ──────────────────────────────────
  const drawField = (label: string, value: string) => {
    if (!value) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(label.toUpperCase() + ":", MARGIN, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    const lines = splitText(doc, value, CONTENT_W - 30);
    doc.text(lines, MARGIN + 30, y);
    y += Math.max(lines.length * 5, 6) + 1;
  };

  drawField("Data", formatDate(minute.meeting_date));
  if (minute.location) drawField("Local", minute.location);
  if (minute.participants) drawField("Participantes", minute.participants);
  if (minute.agenda) drawField("Pauta", minute.agenda);

  y += 3;
  doc.setDrawColor(200, 200, 200);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;

  // ── Conteúdo da ata ────────────────────────────────────
  const content = minute.organized_content || minute.raw_notes || "";

  if (content) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text("CONTEÚDO DA ATA", MARGIN, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 30, 30);

    // Remove markdown formatting for cleaner PDF output
    const cleanContent = content
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/#{1,6}\s/g, "")
      .replace(/^[-–]\s/gm, "• ");

    const lines = splitText(doc, cleanContent, CONTENT_W);

    for (const line of lines) {
      if (y > PAGE_H - MARGIN - 15) {
        doc.addPage();
        y = MARGIN;
      }
      doc.text(line, MARGIN, y);
      y += 5;
    }
  }

  // ── Rodapé ──────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `${projectName} — Ata gerada em ${new Date().toLocaleDateString("pt-BR")} — Página ${i} de ${pageCount}`,
      PAGE_W / 2,
      PAGE_H - 8,
      { align: "center" },
    );
  }

  const fileName = `ata-${minute.meeting_date}-${minute.title.toLowerCase().replace(/\s+/g, "-").slice(0, 30)}.pdf`;
  doc.save(fileName);
}

export function printMeetingMinute(
  minute: MeetingMinute,
  projectName: string,
  logoUrl?: string,
): void {
  const logoHtml =
    logoUrl && !logoUrl.startsWith("data:application/pdf")
      ? `<div class="logo-wrap"><img src="${logoUrl}" class="logo" /></div>`
      : "";

  const field = (label: string, value?: string) =>
    value
      ? `<div class="field"><span class="label">${label}:</span> <span>${value}</span></div>`
      : "";

  const content = minute.organized_content || minute.raw_notes || "";
  const cleanContent = content
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^#{1,6}\s(.+)$/gm, "<h3>$1</h3>")
    .replace(/^[-–•]\s/gm, "• ")
    .replace(/\n/g, "<br/>");

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Ata — ${minute.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 20mm 20mm 15mm; }
    .logo-wrap { text-align: center; margin-bottom: 8px; }
    .logo { max-height: 55px; max-width: 200px; object-fit: contain; }
    .project-name { text-align: center; font-size: 11px; font-weight: 700; color: #555; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px; }
    hr { border: none; border-top: 1px solid #ccc; margin: 8px 0; }
    .doc-title { text-align: center; font-size: 16px; font-weight: 900; text-transform: uppercase; margin: 6px 0 2px; }
    .doc-subtitle { text-align: center; font-size: 10px; color: #666; margin-bottom: 12px; }
    .fields { margin-bottom: 14px; }
    .field { margin-bottom: 4px; font-size: 10.5px; line-height: 1.5; }
    .label { font-weight: 800; text-transform: uppercase; color: #555; font-size: 9.5px; letter-spacing: 0.05em; }
    .content-title { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #555; letter-spacing: 0.08em; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #eee; }
    .content { font-size: 10.5px; line-height: 1.7; white-space: pre-wrap; }
    .content h3 { font-size: 11px; font-weight: 800; margin: 10px 0 4px; }
    footer { position: fixed; bottom: 8mm; left: 20mm; right: 20mm; text-align: center; font-size: 8px; color: #aaa; border-top: 1px solid #eee; padding-top: 4px; }
    @media print { @page { size: A4 portrait; margin: 20mm; } footer { position: fixed; } }
  </style>
</head>
<body>
  ${logoHtml}
  <div class="project-name">${projectName}</div>
  <hr/>
  <div class="doc-title">${minute.title}</div>
  <div class="doc-subtitle">Ata de Reunião</div>
  <hr/>
  <div class="fields">
    ${field("Data", new Date(minute.meeting_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }))}
    ${field("Local", minute.location)}
    ${field("Participantes", minute.participants)}
    ${field("Pauta", minute.agenda)}
  </div>
  ${content ? `<div class="content-title">Conteúdo da Ata</div><div class="content">${cleanContent}</div>` : ""}
  <footer>${projectName} — Ata gerada em ${new Date().toLocaleDateString("pt-BR")}</footer>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) {
    alert("Permita pop-ups para imprimir.");
    return;
  }
  w.document.write(html);
  w.document.close();
}
