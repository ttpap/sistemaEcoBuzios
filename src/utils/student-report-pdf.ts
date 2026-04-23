import jsPDF from "jspdf";

// A4 portrait: 210 x 297 mm
const PAGE_W = 210;
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;

export type StudentStats = {
  totalSessions: number;
  presente: number;
  falta: number;
  atrasado: number;
  justificada: number;
};

export type NumeroStats = {
  classId: string;
  className: string;
  parentClassName?: string;
  stats: StudentStats;
};

export type StudentReportData = {
  studentId: string;
  fullName: string;
  socialName?: string;
  stats: StudentStats;
  numeros?: NumeroStats[];
};

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

function drawDonutChart(stats: StudentStats): string {
  const size = 400;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.42;
  const innerR = size * 0.24;

  const total = stats.presente + stats.falta + stats.atrasado + stats.justificada;

  if (total === 0) {
    ctx.fillStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fill();
    return canvas.toDataURL("image/png");
  }

  const segments = [
    { value: stats.presente, color: "#22c55e" },
    { value: stats.falta, color: "#ef4444" },
    { value: stats.atrasado, color: "#f59e0b" },
    { value: stats.justificada, color: "#8b5cf6" },
  ];

  let startAngle = -Math.PI / 2;
  for (const seg of segments) {
    if (seg.value === 0) continue;
    const sweep = (seg.value / total) * Math.PI * 2;
    ctx.fillStyle = seg.color;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, startAngle, startAngle + sweep);
    ctx.closePath();
    ctx.fill();
    startAngle += sweep;
  }

  // Hole
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fill();

  // Center text
  const pct = Math.round(((stats.presente + stats.atrasado) / total) * 100);
  ctx.fillStyle = "#0f172a";
  ctx.font = `bold ${size * 0.14}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${pct}%`, cx, cy - size * 0.03);
  ctx.font = `${size * 0.07}px Arial`;
  ctx.fillStyle = "#64748b";
  ctx.fillText("freq.", cx, cy + size * 0.08);

  return canvas.toDataURL("image/png");
}

function addLogoFit(
  doc: jsPDF,
  dataUrl: string,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
): void {
  const img = document.createElement("img");
  img.src = dataUrl;
  const nw = img.naturalWidth || img.width || 1;
  const nh = img.naturalHeight || img.height || 1;
  const ratio = nw / nh;
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }
  doc.addImage(dataUrl, getImageFormat(dataUrl), x, y, w, h, "", "FAST");
}

export async function generateStudentReportPdf(
  students: StudentReportData[],
  projectName: string,
  logoProjectUrl: string,
  logoEcobuziosUrl: string,
): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const [logoProjectDataUrl, logoEcoDataUrl] = await Promise.all([
    loadImageAsDataUrl(logoProjectUrl),
    loadImageAsDataUrl(logoEcobuziosUrl),
  ]);

  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  for (let i = 0; i < students.length; i++) {
    if (i > 0) doc.addPage();

    const student = students[i];
    const { stats } = student;
    const studentName = student.socialName
      ? `${student.fullName} (${student.socialName})`
      : student.fullName;

    let cursorY = MARGIN;

    // ── LOGOS ──────────────────────────────────────────────────────────────
    const logoH = 15;
    const logoW = 42;

    if (logoProjectDataUrl) {
      addLogoFit(doc, logoProjectDataUrl, MARGIN, cursorY, logoW, logoH);
    }
    if (logoEcoDataUrl) {
      addLogoFit(doc, logoEcoDataUrl, PAGE_W - MARGIN - logoW, cursorY, logoW, logoH);
    }
    cursorY += logoH + 5;

    // Separator
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, cursorY, PAGE_W - MARGIN, cursorY);
    cursorY += 7;

    // ── CABEÇALHO ──────────────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text("RELATÓRIO DE FREQUÊNCIA", MARGIN, cursorY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(today, PAGE_W - MARGIN, cursorY, { align: "right" });
    cursorY += 8;

    // Nome do aluno
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text(studentName, MARGIN, cursorY);
    cursorY += 6;

    // Projeto
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Projeto: ${projectName}`, MARGIN, cursorY);
    cursorY += 12;

    // ── CARDS DE ESTATÍSTICAS ──────────────────────────────────────────────
    const total = stats.presente + stats.falta + stats.atrasado + stats.justificada;
    const freqPct = total > 0 ? Math.round(((stats.presente + stats.atrasado) / total) * 100) : 0;
    const totalHours = (stats.presente + stats.atrasado) * 2;

    const cardData: { label: string; value: string; r: number; g: number; b: number }[] = [
      { label: "Horas participadas", value: `${totalHours}h`, r: 34, g: 197, b: 94 },
      { label: "Frequência", value: `${freqPct}%`, r: 59, g: 130, b: 246 },
      { label: "Presenças", value: String(stats.presente), r: 16, g: 185, b: 129 },
      { label: "Faltas", value: String(stats.falta), r: 239, g: 68, b: 68 },
      { label: "Atrasos", value: String(stats.atrasado), r: 245, g: 158, b: 11 },
      { label: "Justificadas", value: String(stats.justificada), r: 139, g: 92, b: 246 },
    ];

    const cols = 3;
    const gap = 4;
    const cardW = (CONTENT_W - gap * (cols - 1)) / cols;
    const cardH = 22;
    const rowGap = 4;

    for (let ci = 0; ci < cardData.length; ci++) {
      const col = ci % cols;
      const row = Math.floor(ci / cols);
      const cx = MARGIN + col * (cardW + gap);
      const cy2 = cursorY + row * (cardH + rowGap);
      const card = cardData[ci];

      doc.setFillColor(card.r, card.g, card.b);
      doc.roundedRect(cx, cy2, cardW, cardH, 3, 3, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.setTextColor(255, 255, 255);
      doc.text(card.value, cx + cardW / 2, cy2 + 13, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(220, 255, 220);
      doc.text(card.label, cx + cardW / 2, cy2 + 19.5, { align: "center" });
    }

    const totalRows = Math.ceil(cardData.length / cols);
    cursorY += totalRows * (cardH + rowGap) + 12;

    // ── GRÁFICO + LEGENDA ──────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text("Distribuição de Frequência", MARGIN, cursorY);
    cursorY += 6;

    const chartDataUrl = drawDonutChart(stats);
    const chartSize = 72;
    const chartX = MARGIN + CONTENT_W * 0.1;
    doc.addImage(chartDataUrl, "PNG", chartX, cursorY, chartSize, chartSize);

    // Legend
    const legendX = MARGIN + CONTENT_W * 0.55;
    const legendItems: { label: string; count: number; r: number; g: number; b: number }[] = [
      { label: "Presenças", count: stats.presente, r: 34, g: 197, b: 94 },
      { label: "Faltas", count: stats.falta, r: 239, g: 68, b: 68 },
      { label: "Atrasos", count: stats.atrasado, r: 245, g: 158, b: 11 },
      { label: "Justificadas", count: stats.justificada, r: 139, g: 92, b: 246 },
    ];

    let legendY = cursorY + (chartSize / 2) - (legendItems.length * 10) / 2 + 5;
    for (const item of legendItems) {
      doc.setFillColor(item.r, item.g, item.b);
      doc.roundedRect(legendX, legendY - 3.5, 5, 5, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 30, 30);
      doc.text(`${item.label}:`, legendX + 8, legendY);
      doc.setFont("helvetica", "normal");
      const labelW = doc.getTextWidth(`${item.label}: `);
      doc.text(String(item.count), legendX + 8 + labelW - 2, legendY);
      legendY += 11;
    }

    // ── NÚMEROS PARTICIPADOS ───────────────────────────────────────────────
    cursorY += chartSize + 10;
    if (student.numeros && student.numeros.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text("Números participados", MARGIN, cursorY);
      cursorY += 6;

      for (const n of student.numeros) {
        const nTotal = n.stats.presente + n.stats.falta + n.stats.atrasado + n.stats.justificada;
        const nFreq = nTotal > 0 ? Math.round(((n.stats.presente + n.stats.atrasado) / nTotal) * 100) : 0;
        const nHours = (n.stats.presente + n.stats.atrasado) * 2;
        const blockH = 38;

        // Page break se não cabe
        if (cursorY + blockH > 280) {
          doc.addPage();
          cursorY = MARGIN;
        }

        // Border amarelo + fundo creme
        doc.setFillColor(255, 251, 235);
        doc.setDrawColor(251, 191, 36);
        doc.setLineWidth(0.6);
        doc.roundedRect(MARGIN, cursorY, CONTENT_W, blockH, 2, 2, "FD");

        // Título número + turma pai
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(146, 64, 14);
        doc.text(n.className, MARGIN + 3, cursorY + 5);
        if (n.parentClassName) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(161, 98, 7);
          doc.text(`Turma: ${n.parentClassName}`, PAGE_W - MARGIN - 3, cursorY + 5, { align: "right" });
        }

        // Donut chart (esquerda)
        const donutSize = 28;
        const donutX = MARGIN + 3;
        const donutY = cursorY + 8;
        const donutDataUrl = drawDonutChart(n.stats);
        doc.addImage(donutDataUrl, "PNG", donutX, donutY, donutSize, donutSize);

        // Cards 3x2 (direita)
        const cardsX = donutX + donutSize + 4;
        const cardsAreaW = CONTENT_W - donutSize - 10;
        const nCols = 3;
        const nRows = 2;
        const nGap = 2;
        const nCardW = (cardsAreaW - nGap * (nCols - 1)) / nCols;
        const nCardH = (donutSize - nGap) / nRows;
        const cards: { label: string; value: string; r: number; g: number; b: number }[] = [
          { label: "Horas", value: `${nHours}h`, r: 34, g: 197, b: 94 },
          { label: "Frequência", value: `${nFreq}%`, r: 59, g: 130, b: 246 },
          { label: "Presenças", value: String(n.stats.presente + n.stats.atrasado), r: 16, g: 185, b: 129 },
          { label: "Faltas", value: String(n.stats.falta), r: 239, g: 68, b: 68 },
          { label: "Justificadas", value: String(n.stats.justificada), r: 139, g: 92, b: 246 },
          { label: "Aulas", value: String(nTotal), r: 100, g: 116, b: 139 },
        ];
        for (let ci = 0; ci < cards.length; ci++) {
          const card = cards[ci];
          const col = ci % nCols;
          const row = Math.floor(ci / nCols);
          const cxCard = cardsX + col * (nCardW + nGap);
          const cyCard = donutY + row * (nCardH + nGap);
          doc.setFillColor(card.r, card.g, card.b);
          doc.roundedRect(cxCard, cyCard, nCardW, nCardH, 2, 2, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(255, 255, 255);
          doc.text(card.value, cxCard + nCardW / 2, cyCard + nCardH / 2, { align: "center", baseline: "middle" });
          doc.setFont("helvetica", "normal");
          doc.setFontSize(6);
          doc.text(card.label, cxCard + nCardW / 2, cyCard + nCardH - 1.5, { align: "center" });
        }

        cursorY += blockH + 4;
      }
      cursorY += 2;
    }

    // Total de aulas
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Total de aulas registradas: ${total}  •  Carga horária total: ${total * 2}h  •  Horas frequentadas: ${totalHours}h`,
      PAGE_W / 2,
      cursorY,
      { align: "center" },
    );
  }

  const filename =
    students.length === 1
      ? `relatorio_${students[0].fullName.replace(/\s+/g, "_")}.pdf`
      : `relatorios_frequencia.pdf`;

  doc.save(filename);
}
