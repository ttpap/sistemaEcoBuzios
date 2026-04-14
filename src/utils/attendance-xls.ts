import { getActiveProject } from "@/utils/projects";
import { getSystemLogo } from "@/utils/system-settings";
import type { AttendanceStatus } from "@/types/attendance";
import type { AttendanceMatrix } from "@/utils/attendance-pdf";

const DEFAULT_LOGO = "https://files.dyad.sh/pasted-image-2026-02-19T16-19-18-020Z.png";

function monthLabel(month: string) {
  const [y, m] = month.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(d);
}

function formatDateCol(ymd: string) {
  const [, m, d] = ymd.split("-");
  return `${d}/${m}`;
}

function displayName(st: AttendanceMatrix["students"][number]) {
  return st.socialName || st.preferredName || st.fullName;
}

function statusShort(s?: AttendanceStatus) {
  if (!s) return "";
  if (s === "presente") return "P";
  if (s === "atrasado") return "A";
  if (s === "falta") return "F";
  if (s === "justificada") return "J";
  return "";
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

/**
 * Generates a simple Excel-compatible .xls file (HTML table).
 * Works offline and doesn't require extra dependencies.
 */
export async function downloadAttendanceXls(matrix: AttendanceMatrix) {
  const project = getActiveProject();
  const projectName = project?.name || "Projeto";
  const title = "Relatório de Chamada";
  const subtitle = `Turma: ${matrix.className} • ${monthLabel(matrix.month)}`;
  const generated = `Gerado em ${new Date().toLocaleString("pt-BR")}`;

  const logoUrl = getReportLogoUrl();
  const logoDataUrl = logoUrl.startsWith("data:image/") ? logoUrl : (await loadImageToPngDataUrl(logoUrl));

  const head = ["Aluno", ...matrix.dates.map((d) => formatDateCol(d))];

  const rows = matrix.students.map((st) => {
    const cells: string[] = [];
    cells.push(`${escapeHtml(displayName(st))}<br/><span style="color:#64748b;font-weight:700;">${escapeHtml(st.fullName)}</span>`);

    for (const date of matrix.dates) {
      const isMember = matrix.membershipByStudentByDate[st.id]?.[date];
      if (!isMember) {
        cells.push("—");
        continue;
      }
      const v = matrix.statusByStudentByDate[st.id]?.[date];
      cells.push(escapeHtml(statusShort(v)));
    }

    return cells;
  });

  const legend = "Legenda: P=Presente • A=Atrasado • F=Falta • J=Justificada • —=não estava na turma";

  const html = `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; }
        table { border-collapse: collapse; }
        td, th { border: 1px solid #0f172a; padding: 6px 8px; font-size: 11px; }
        th { background: #f1f5f9; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; font-size: 10px; }

        .hrow td { border: none; padding: 0; }
        .headcard {
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          overflow: hidden;
        }
        .brandbar { height: 8px; background: #008ca0; }
        .headinner { padding: 12px 14px; }
        .brand { display:flex; align-items:center; gap: 12px; }
        .logo { height: 44px; width: auto; display:block; }
        .kicker { font-size: 10px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; color: #64748b; }
        .title { font-size: 16px; font-weight: 900; margin-top: 2px; color: #0f172a; }
        .sub { font-size: 12px; font-weight: 800; margin-top: 3px; color: #334155; }
        .meta { font-size: 10px; font-weight: 700; margin-top: 8px; color: #64748b; }
        .legend { font-size: 10px; font-weight: 800; margin-top: 6px; color: #334155; }
      </style>
    </head>
    <body>
      <table>
        <tr class="hrow">
          <td colspan="${head.length}">
            <div class="headcard">
              <div class="brandbar"></div>
              <div class="headinner">
                <div class="brand">
                  ${logoDataUrl ? `<img class="logo" src="${logoDataUrl}" alt="Logo" />` : ""}
                  <div>
                    <div class="kicker">${escapeHtml(projectName)}</div>
                    <div class="title">${escapeHtml(title)}</div>
                    <div class="sub">${escapeHtml(subtitle)}</div>
                  </div>
                </div>
                <div class="meta">${escapeHtml(generated)}</div>
                <div class="legend">${escapeHtml(legend)}</div>
              </div>
            </div>
          </td>
        </tr>

        <tr><td colspan="${head.length}" style="border:none;padding:8px 0;"></td></tr>

        <tr>${head.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>
        ${rows
          .map(
            (r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`,
          )
          .join("")}
      </table>
    </body>
  </html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const filename = filenameSafe(`relatorio-chamada-${matrix.className}-${matrix.month}.xls`);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadMultiAttendanceXls(matrices: AttendanceMatrix[]) {
  if (matrices.length === 0) return;

  const project = getActiveProject();
  const projectName = project?.name || "Projeto";
  const generated = `Gerado em ${new Date().toLocaleString("pt-BR")}`;
  const legend = "Legenda: P=Presente • A=Atrasado • F=Falta • J=Justificada • —=não estava na turma";

  const logoUrl = getReportLogoUrl();
  const logoDataUrl = logoUrl.startsWith("data:image/") ? logoUrl : (await loadImageToPngDataUrl(logoUrl));

  const sections: string[] = [];

  for (const matrix of matrices) {
    const title = "Relatório de Chamada";
    const subtitle = `Turma: ${matrix.className} • ${monthLabel(matrix.month)}`;
    const head = ["Aluno", ...matrix.dates.map((d) => formatDateCol(d))];

    const rows = matrix.students.map((st) => {
      const cells: string[] = [];
      cells.push(`${escapeHtml(displayName(st))}<br/><span style="color:#64748b;font-weight:700;">${escapeHtml(st.fullName)}</span>`);

      for (const date of matrix.dates) {
        const isMember = matrix.membershipByStudentByDate[st.id]?.[date];
        if (!isMember) {
          cells.push("—");
          continue;
        }
        const v = matrix.statusByStudentByDate[st.id]?.[date];
        cells.push(escapeHtml(statusShort(v)));
      }

      return cells;
    });

    sections.push(`
        <tr class="hrow">
          <td colspan="${head.length}">
            <div class="headcard">
              <div class="brandbar"></div>
              <div class="headinner">
                <div class="brand">
                  ${logoDataUrl ? `<img class="logo" src="${logoDataUrl}" alt="Logo" />` : ""}
                  <div>
                    <div class="kicker">${escapeHtml(projectName)}</div>
                    <div class="title">${escapeHtml(title)}</div>
                    <div class="sub">${escapeHtml(subtitle)}</div>
                  </div>
                </div>
                <div class="meta">${escapeHtml(generated)}</div>
                <div class="legend">${escapeHtml(legend)}</div>
              </div>
            </div>
          </td>
        </tr>

        <tr><td colspan="${head.length}" style="border:none;padding:8px 0;"></td></tr>

        <tr>${head.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>
        ${rows
          .map(
            (r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`,
          )
          .join("")}

        <tr><td colspan="${head.length}" style="border:none;padding:16px 0;"></td></tr>
    `);
  }

  const html = `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; }
        table { border-collapse: collapse; }
        td, th { border: 1px solid #0f172a; padding: 6px 8px; font-size: 11px; }
        th { background: #f1f5f9; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; font-size: 10px; }

        .hrow td { border: none; padding: 0; }
        .headcard {
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          overflow: hidden;
        }
        .brandbar { height: 8px; background: #008ca0; }
        .headinner { padding: 12px 14px; }
        .brand { display:flex; align-items:center; gap: 12px; }
        .logo { height: 44px; width: auto; display:block; }
        .kicker { font-size: 10px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; color: #64748b; }
        .title { font-size: 16px; font-weight: 900; margin-top: 2px; color: #0f172a; }
        .sub { font-size: 12px; font-weight: 800; margin-top: 3px; color: #334155; }
        .meta { font-size: 10px; font-weight: 700; margin-top: 8px; color: #64748b; }
        .legend { font-size: 10px; font-weight: 800; margin-top: 6px; color: #334155; }
      </style>
    </head>
    <body>
      <table>
        ${sections.join("")}
      </table>
    </body>
  </html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const filename = filenameSafe(`relatorio-chamada-${matrices[0].month}.xls`);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}