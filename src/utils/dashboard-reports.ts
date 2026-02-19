import { AttendanceSession } from "@/types/attendance";

type Pair = { name: string; value: number };

function formatMonthLabel(monthKey: string) {
  const [y, m] = monthKey.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(d);
}

function openPrintWindow(title: string, subtitle: string, bodyHtml: string) {
  const win = window.open("", "_blank");
  if (!win) return;

  const html = `
  <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; margin: 18px; }
        .header { font-weight: 800; font-size: 14px; margin-bottom: 6px; }
        .sub { font-size: 11px; margin-bottom: 10px; color: #334155; font-weight: 700; }
        .meta { color: #64748b; font-size: 10px; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #111827; padding: 6px 8px; }
        th { background: #f3f4f6; text-align: left; font-weight: 800; }
        td.num, th.num { text-align: right; font-weight: 800; }
        .pill { display:inline-block; padding: 2px 8px; border-radius: 999px; font-weight: 800; font-size: 10px; border: 1px solid #e2e8f0; background: #fff; }
        .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media print { @page { size: portrait; margin: 1cm; } }
      </style>
    </head>
    <body>
      <div class="header">${title}</div>
      <div class="sub">${subtitle}</div>
      <div class="meta">Gerado em ${new Date().toLocaleString("pt-BR")}</div>
      ${bodyHtml}
    </body>
  </html>`;

  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 250);
}

function renderSimpleTable(rows: Pair[], totalLabel = "Total") {
  const total = rows.reduce((acc, r) => acc + r.value, 0);
  const sorted = [...rows].sort((a, b) => b.value - a.value);

  return `
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th class="num">Alunos</th>
        </tr>
      </thead>
      <tbody>
        ${sorted
          .map(
            (r) => `
          <tr>
            <td>${r.name}</td>
            <td class="num">${r.value}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td class="num"><strong>${totalLabel}:</strong></td>
          <td class="num"><strong>${total}</strong></td>
        </tr>
      </tfoot>
    </table>
  `;
}

export function printSchoolTypeReport(params: {
  monthKey: string;
  classCount: number;
  teacherCount: number;
  studentCount: number;
  rows: Pair[];
}) {
  const title = "Relatório — Escolaridade (Tipo de escola)";
  const subtitle = `Mês referência: ${formatMonthLabel(params.monthKey)} • Alunos nas turmas: ${params.studentCount} • Turmas ativas: ${params.classCount} • Professores ativos: ${params.teacherCount}`;

  const body = `
    ${renderSimpleTable(params.rows, "Total")}
    <div style="margin-top:12px" class="meta">
      Observação: considera apenas alunos ativos vinculados às turmas ativas.
    </div>
  `;

  openPrintWindow(title, subtitle, body);
}

export function printInstitutionsReport(params: {
  monthKey: string;
  classCount: number;
  teacherCount: number;
  studentCount: number;
  rows: Pair[];
}) {
  const title = "Relatório — Instituições";
  const subtitle = `Mês referência: ${formatMonthLabel(params.monthKey)} • Alunos nas turmas: ${params.studentCount} • Turmas ativas: ${params.classCount} • Professores ativos: ${params.teacherCount}`;

  const body = `
    <div class="meta">Contagem de alunos por instituição (escola/universidade).</div>
    ${renderSimpleTable(params.rows, "Total")}
  `;

  openPrintWindow(title, subtitle, body);
}

export function printNeighborhoodsReport(params: {
  monthKey: string;
  classCount: number;
  teacherCount: number;
  studentCount: number;
  rows: Pair[];
}) {
  const title = "Relatório — Bairros";
  const subtitle = `Mês referência: ${formatMonthLabel(params.monthKey)} • Alunos nas turmas: ${params.studentCount} • Turmas ativas: ${params.classCount} • Professores ativos: ${params.teacherCount}`;

  const body = `
    <div class="meta">Distribuição dos alunos por bairro.</div>
    ${renderSimpleTable(params.rows, "Total")}
  `;

  openPrintWindow(title, subtitle, body);
}

export function printAttendanceMonthSummary(params: {
  monthKey: string;
  sessions: AttendanceSession[];
}) {
  const title = "Relatório — Chamadas (mês)";
  const subtitle = `${formatMonthLabel(params.monthKey)} • Total de chamadas: ${params.sessions.length}`;

  const rows: Pair[] = Array.from(
    params.sessions.reduce((acc, s) => {
      acc.set(s.classId, (acc.get(s.classId) || 0) + 1);
      return acc;
    }, new Map<string, number>()).entries(),
  ).map(([name, value]) => ({ name, value }));

  const body = `
    <div class="meta">Chamadas por turma (classId). (Pode ser melhorado para mostrar nome da turma.)</div>
    ${renderSimpleTable(rows, "Total")}
  `;

  openPrintWindow(title, subtitle, body);
}
