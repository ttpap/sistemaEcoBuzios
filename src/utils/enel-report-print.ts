import type { EnelRow } from "@/utils/enel-report-pdf";

function monthLabel(month: string) {
  const [y, m] = month.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(d);
}

function formatBirthDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function escapeHtml(input: string) {
  return String(input || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function printEnelReport(input: {
  month: string;
  projectName: string;
  rows: EnelRow[];
  includeEnelNumber: boolean;
}) {
  const w = window.open("", "_blank");
  if (!w) return;

  const head = input.includeEnelNumber
    ? ["Nome", "Celular", "Data Nascimento", "Idade", "CPF", "Número ENEL"]
    : ["Nome", "Celular", "Data Nascimento", "Idade", "CPF"];

  const html = `
  <html>
    <head>
      <title>Relatório ENEL</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; color: #111827; }
        .header { display:flex; justify-content: space-between; align-items: baseline; gap: 16px; }
        .title { font-size: 14px; font-weight: 900; }
        .meta { font-size: 11px; font-weight: 700; color: #374151; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #111827; padding: 6px 8px; }
        th { background: #f3f4f6; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; font-size: 9px; }
        td { vertical-align: top; }
        .center { text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">RELATÓRIO ENEL</div>
        <div class="meta">Projeto: ${escapeHtml(input.projectName)} • ${escapeHtml(monthLabel(input.month))}</div>
      </div>

      <table>
        <thead>
          <tr>
            ${head.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${input.rows
            .map((r) => {
              const baseCells = [
                `<td>${escapeHtml(r.name)}</td>`,
                `<td class="center">${escapeHtml(r.cellPhone)}</td>`,
                `<td class="center">${escapeHtml(formatBirthDate(r.birthDate))}</td>`,
                `<td class="center">${escapeHtml(String(r.age ?? ""))}</td>`,
                `<td class="center">${escapeHtml(r.cpf)}</td>`,
              ];
              if (input.includeEnelNumber) baseCells.push(`<td class="center">${escapeHtml(r.enelClientNumber)}</td>`);
              return `<tr>${baseCells.join("")}</tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </body>
  </html>`;

  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 200);
}
