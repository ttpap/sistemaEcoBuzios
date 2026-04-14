import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AttendanceStatus } from "@/types/attendance";
import { getActiveProject } from "@/utils/projects";
import { getSystemLogo } from "@/utils/system-settings";

export type AttendanceMatrix = {
  className: string;
  month: string; // YYYY-MM
  dates: string[]; // YYYY-MM-DD sorted
  students: Array<{ id: string; fullName: string; socialName?: string; preferredName?: string }>;
  statusByStudentByDate: Record<string, Record<string, AttendanceStatus | undefined>>;
  membershipByStudentByDate: Record<string, Record<string, boolean>>;
};

const DEFAULT_LOGO = "https://files.dyad.sh/pasted-image-2026-02-19T16-19-18-020Z.png";

const BRAND = {
  primary: [0, 140, 160] as const, // #008ca0
  accent: [255, 165, 52] as const, // #ffa534
  slate: [15, 23, 42] as const, // #0f172a
  muted: [100, 116, 139] as const, // #64748b
};

function monthLabel(month: string) {
  const [y, m] = month.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(d);
}

function formatDatePt(ymd: string) {
  const [, m, d] = ymd.split("-");
  return `${d}/${m}`;
}

function displaySocialName(st: AttendanceMatrix["students"][number]) {
  return st.socialName || st.preferredName || st.fullName;
}

function statusShort(s?: AttendanceStatus) {
  switch (s) {
    case "presente":
      return "P";
    case "atrasado":
      return "A";
    case "falta":
      return "F";
    case "justificada":
      return "J";
    default:
      return "";
  }
}

function getReportLogoUrl(): string {
  const projectLogo = getActiveProject()?.imageUrl;
  return projectLogo || getSystemLogo() || DEFAULT_LOGO;
}

function getReportProjectName(): string {
  return getActiveProject()?.name || "EcoBúzios";
}

function loadImageAsPngWithSize(url: string): Promise<{ dataUrl: string; w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL("image/png"), w, h });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function generateAttendancePdf(matrix: AttendanceMatrix) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  const projectName = getReportProjectName();
  const title = "Relatório de Chamada";
  const subtitle = `Turma: ${matrix.className} • ${monthLabel(matrix.month)}`;

  // Header (brand strip + logo + title card)
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;

  // Brand strips
  doc.setFillColor(...BRAND.primary);
  doc.rect(marginX, 18, pageWidth - marginX * 2, 6, "F");
  doc.setFillColor(...BRAND.accent);
  doc.rect(marginX, 24, 90, 3, "F");

  // Logo (keep aspect ratio to avoid distortion)
  const logoUrl = getReportLogoUrl();
  const logoInfo = await loadImageAsPngWithSize(logoUrl);

  const maxLogoW = 130;
  const maxLogoH = 42;
  const logoX = marginX;
  const logoY = 34;

  let textX = marginX;

  if (logoInfo) {
    const scale = Math.min(maxLogoW / logoInfo.w, maxLogoH / logoInfo.h, 1);
    const w = logoInfo.w * scale;
    const h = logoInfo.h * scale;
    const y = logoY + (maxLogoH - h) / 2;

    try {
      doc.addImage(logoInfo.dataUrl, "PNG", logoX, y, w, h);
      textX = logoX + maxLogoW + 14;
    } catch {
      // ignore logo errors
    }
  }

  doc.setTextColor(...BRAND.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(projectName.toUpperCase(), textX, 42);

  doc.setTextColor(...BRAND.slate);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(title, textX, 60);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(subtitle, textX, 78);

  doc.setFontSize(9);
  doc.setTextColor(...BRAND.muted);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, marginX, 96);
  doc.text(
    "Legenda: P=Presente • A=Atrasado • F=Falta • J=Justificada • —=não estava na turma",
    marginX,
    110,
    { maxWidth: pageWidth - marginX * 2 },
  );

  doc.setTextColor(0, 0, 0);

  const head = [["Aluno", ...matrix.dates.map((d) => formatDatePt(d))]];

  const body = matrix.students.map((st) => {
    const row: string[] = [];
    row.push(`${displaySocialName(st)}\n${st.fullName}`);

    for (const date of matrix.dates) {
      const isMember = matrix.membershipByStudentByDate[st.id]?.[date];
      if (!isMember) {
        row.push("—");
        continue;
      }
      const status = matrix.statusByStudentByDate[st.id]?.[date];
      row.push(statusShort(status));
    }

    return row;
  });

  autoTable(doc, {
    startY: 128,
    head,
    body,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 4,
      valign: "top",
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 180 },
    },
    horizontalPageBreak: true,
    horizontalPageBreakRepeat: 0,
    didParseCell: (data) => {
      // Center all status cells
      if (data.section === "body" && data.column.index > 0) {
        data.cell.styles.halign = "center";
      }
    },
  });

  const filename = `relatorio-chamada-${matrix.className}-${matrix.month}.pdf`
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_.]/g, "");

  doc.save(filename);
}

export async function generateMultiAttendancePdf(matrices: AttendanceMatrix[]) {
  if (matrices.length === 0) return;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const projectName = getReportProjectName();
  const logoUrl = getReportLogoUrl();
  const logoInfo = await loadImageAsPngWithSize(logoUrl);
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;

  for (let i = 0; i < matrices.length; i++) {
    const matrix = matrices[i];
    if (i > 0) doc.addPage();

    const title = "Relatório de Chamada";
    const subtitle = `Turma: ${matrix.className} • ${monthLabel(matrix.month)}`;

    // Brand strips
    doc.setFillColor(...BRAND.primary);
    doc.rect(marginX, 18, pageWidth - marginX * 2, 6, "F");
    doc.setFillColor(...BRAND.accent);
    doc.rect(marginX, 24, 90, 3, "F");

    const maxLogoW = 130;
    const maxLogoH = 42;
    const logoX = marginX;
    const logoY = 34;
    let textX = marginX;

    if (logoInfo) {
      const scale = Math.min(maxLogoW / logoInfo.w, maxLogoH / logoInfo.h, 1);
      const w = logoInfo.w * scale;
      const h = logoInfo.h * scale;
      const y = logoY + (maxLogoH - h) / 2;
      try {
        doc.addImage(logoInfo.dataUrl, "PNG", logoX, y, w, h);
        textX = logoX + maxLogoW + 14;
      } catch {
        // ignore logo errors
      }
    }

    doc.setTextColor(...BRAND.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(projectName.toUpperCase(), textX, 42);

    doc.setTextColor(...BRAND.slate);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(title, textX, 60);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(subtitle, textX, 78);

    doc.setFontSize(9);
    doc.setTextColor(...BRAND.muted);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, marginX, 96);
    doc.text(
      "Legenda: P=Presente • A=Atrasado • F=Falta • J=Justificada • —=não estava na turma",
      marginX,
      110,
      { maxWidth: pageWidth - marginX * 2 },
    );

    doc.setTextColor(0, 0, 0);

    const head = [["Aluno", ...matrix.dates.map((d) => formatDatePt(d))]];

    const body = matrix.students.map((st) => {
      const row: string[] = [];
      row.push(`${displaySocialName(st)}\n${st.fullName}`);

      for (const date of matrix.dates) {
        const isMember = matrix.membershipByStudentByDate[st.id]?.[date];
        if (!isMember) {
          row.push("—");
          continue;
        }
        const status = matrix.statusByStudentByDate[st.id]?.[date];
        row.push(statusShort(status));
      }

      return row;
    });

    autoTable(doc, {
      startY: 128,
      head,
      body,
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 4,
        valign: "top",
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: 180 },
      },
      horizontalPageBreak: true,
      horizontalPageBreakRepeat: 0,
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index > 0) {
          data.cell.styles.halign = "center";
        }
      },
    });
  }

  const filename = `relatorio-chamada-${matrices[0].month}.pdf`
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_.]/g, "");

  doc.save(filename);
}