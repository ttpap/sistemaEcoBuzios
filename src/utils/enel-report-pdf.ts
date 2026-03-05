import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getActiveProject } from "@/utils/projects";
import { getSystemLogo } from "@/utils/system-settings";

const DEFAULT_LOGO = "https://files.dyad.sh/pasted-image-2026-02-19T16-19-18-020Z.png";

export type EnelRow = {
  name: string;
  cellPhone: string;
  birthDate: string;
  age: number;
  cpf: string;
  enelClientNumber: string;
};

function monthLabel(month: string) {
  const [y, m] = month.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(d);
}

function formatBirthDate(iso: string) {
  if (!iso) return "";
  // iso expected YYYY-MM-DD
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function filenameSafe(input: string) {
  return input
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_.]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 140);
}

function getReportLogoUrl(): string {
  const projectLogo = getActiveProject()?.imageUrl;
  return projectLogo || getSystemLogo() || DEFAULT_LOGO;
}

function loadImageToPngDataUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function generateEnelPdf(input: {
  month: string;
  rows: EnelRow[];
  projectName?: string;
  projectLogoUrl?: string | null;
  includeEnelNumber?: boolean;
}) {
  const activeProject = getActiveProject();
  const projectName = input.projectName || activeProject?.name || "Projeto";
  const includeEnel = input.includeEnelNumber !== false;

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  // Header
  const logoUrl = input.projectLogoUrl ?? getReportLogoUrl();
  const logoDataUrl = logoUrl.startsWith("data:image/") ? logoUrl : await loadImageToPngDataUrl(logoUrl);

  const marginX = 40;
  let y = 42;

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", marginX, y, 56, 56);
    } catch {
      // ignore
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("RELATÓRIO ENEL", logoDataUrl ? marginX + 70 : marginX, y + 22);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(projectName, logoDataUrl ? marginX + 70 : marginX, y + 40);

  doc.setFont("helvetica", "bold");
  doc.text(monthLabel(input.month), logoDataUrl ? marginX + 70 : marginX, y + 58);

  y += 78;

  const head = includeEnel
    ? [["Nome", "Celular", "Nascimento", "Idade", "CPF", "Nº ENEL"]]
    : [["Nome", "Celular", "Nascimento", "Idade", "CPF"]];

  const body = input.rows.map((r) => {
    const base = [r.name, r.cellPhone, formatBirthDate(r.birthDate), String(r.age ?? ""), r.cpf];
    return includeEnel ? [...base, r.enelClientNumber] : base;
  });

  autoTable(doc, {
    startY: y,
    head,
    body,
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 5,
      lineColor: [15, 23, 42],
      lineWidth: 0.75,
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: includeEnel
      ? {
          0: { cellWidth: 160 },
          1: { cellWidth: 90, halign: "center" },
          2: { cellWidth: 80, halign: "center" },
          3: { cellWidth: 45, halign: "center" },
          4: { cellWidth: 90, halign: "center" },
          5: { cellWidth: 80, halign: "center" },
        }
      : {
          0: { cellWidth: 190 },
          1: { cellWidth: 100, halign: "center" },
          2: { cellWidth: 90, halign: "center" },
          3: { cellWidth: 55, halign: "center" },
          4: { cellWidth: 110, halign: "center" },
        },
  });

  const filename = filenameSafe(`relatorio-enel-${projectName}-${input.month}.pdf`);
  doc.save(filename);
}