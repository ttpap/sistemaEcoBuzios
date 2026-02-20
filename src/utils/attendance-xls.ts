import { getActiveProject } from "@/utils/projects";
import type { AttendanceMatrix } from "@/utils/attendance-pdf";

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

function statusShort(s?: string) {
  if (!s) return "";
  // matrix stores the raw keys (presente/falta/atrasado/justificada)
  if (s === "presente") return "P";
  if (s === "atrasado") return "A";
  if (s === "falta") return "F";
  if (s === "justificada") return "J";
  return String(s);
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

/**
 * Generates a simple Excel-compatible .xls file (HTML table).
 * Works offline and doesn't require extra dependencies.
 */
export function downloadAttendanceXls(matrix: AttendanceMatrix) {
  const projectName = getActiveProject()?.name || "Projeto";
  const title = "Relatório de Chamada";
  const subtitle = `Turma: ${matrix.className} • ${monthLabel(matrix.month)}`;
  const generated = `Gerado em ${new Date().toLocaleString("pt-BR")}`;

  const head = ["Aluno", ...matrix.dates.map((d) => formatDateCol(d))];

  const rows = matrix.students.map((st) => {
    const cells: string[] = [];
    cells.push(`${escapeHtml(displayName(st))}\n${escapeHtml(st.fullName)}`);

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

  const html = `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; }
        table { border-collapse: collapse; }
        td, th { border: 1px solid #0f172a; padding: 6px 8px; font-size: 11px; }
        th { background: #f1f5f9; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; font-size: 10px; }
        .title { font-size: 16px; font-weight: 900; border: none; padding: 0 0 8px 0; }
        .sub { font-size: 12px; font-weight: 700; border: none; padding: 0 0 6px 0; color: #334155; }
        .meta { font-size: 10px; border: none; padding: 0 0 12px 0; color: #64748b; }
      </style>
    </head>
    <body>
      <table>
        <tr><td class="title" colspan="${head.length}">${escapeHtml(projectName)} — ${escapeHtml(title)}</td></tr>
        <tr><td class="sub" colspan="${head.length}">${escapeHtml(subtitle)}</td></tr>
        <tr><td class="meta" colspan="${head.length}">${escapeHtml(generated)}</td></tr>
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