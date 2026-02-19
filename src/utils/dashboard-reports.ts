import { AttendanceSession } from "@/types/attendance";

type Pair = { name: string; value: number };

const BRAND = {
  logoUrl: "https://files.dyad.sh/pasted-image-2026-02-18T17-34-12-789Z.png",
  primary: "#008ca0",
  accent: "#ffa534",
  slate: "#0f172a",
  muted: "#64748b",
};

function formatMonthLabel(monthKey: string) {
  const [y, m] = monthKey.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(d);
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openPrintWindow(title: string, subtitle: string, bodyHtml: string) {
  const win = window.open("", "_blank");
  if (!win) return;

  const html = `
  <html>
    <head>
      <title>${escapeHtml(title)}</title>
      <style>
        :root {
          --primary: ${BRAND.primary};
          --accent: ${BRAND.accent};
          --slate: ${BRAND.slate};
          --muted: ${BRAND.muted};
          --border: #e2e8f0;
          --bg: #ffffff;
          --soft: #f8fafc;
        }

        * { box-sizing: border-box; }
        body { font-family: Inter, Arial, sans-serif; font-size: 11px; margin: 18px; color: var(--slate); }
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 16px;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: var(--bg);
        }
        .brand { display:flex; align-items:center; gap: 12px; min-width: 0; }
        .logo { width: 140px; height: 44px; object-fit: contain; }
        .titlewrap { min-width: 0; }
        .header { font-weight: 900; font-size: 14px; margin: 0; letter-spacing: -0.02em; }
        .sub { font-size: 11px; margin-top: 4px; color: #334155; font-weight: 800; }
        .meta { color: var(--muted); font-size: 10px; margin-top: 10px; }

        .section { margin-top: 14px; }
        .card {
          border: 1px solid var(--border);
          border-radius: 18px;
          background: var(--bg);
          overflow: hidden;
        }
        .card-head {
          padding: 12px 14px;
          background: var(--soft);
          border-bottom: 1px solid var(--border);
          display:flex;
          align-items:center;
          justify-content: space-between;
          gap: 10px;
        }
        .card-title {
          font-weight: 900;
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #475569;
        }
        .badge {
          display:inline-flex;
          align-items:center;
          gap: 6px;
          border-radius: 999px;
          padding: 4px 10px;
          font-weight: 900;
          font-size: 10px;
          border: 1px solid rgba(0, 140, 160, 0.25);
          background: rgba(0, 140, 160, 0.08);
          color: var(--primary);
        }

        .grid2 { display:grid; grid-template-columns: 1.05fr 1fr; gap: 12px; }
        .pad { padding: 14px; }

        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #0f172a; padding: 6px 8px; }
        th { background: #f1f5f9; text-align: left; font-weight: 900; }
        td.num, th.num { text-align: right; font-weight: 900; }

        .chart {
          border: 1px solid var(--border);
          border-radius: 16px;
          background: #ffffff;
          padding: 12px;
        }
        .chart-title { font-size: 10px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; color: #64748b; margin-bottom: 8px; }

        .bars { display:flex; flex-direction: column; gap: 8px; }
        .bar-row { display:grid; grid-template-columns: 1fr 120px; gap: 10px; align-items:center; }
        .bar-label { font-weight: 800; color: #334155; overflow:hidden; text-overflow: ellipsis; white-space: nowrap; }
        .bar-track { height: 10px; border-radius: 999px; background: #eef2f7; overflow:hidden; border: 1px solid #e2e8f0; }
        .bar-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--primary), var(--accent)); }
        .bar-value { text-align: right; font-weight: 900; color: #0f172a; }

        .donut-wrap { display:grid; grid-template-columns: 140px 1fr; gap: 12px; align-items: center; }
        .donut {
          width: 140px;
          height: 140px;
          border-radius: 999px;
          background: conic-gradient(var(--primary) 0deg, var(--primary) 0deg);
          position: relative;
          border: 1px solid var(--border);
        }
        .donut::after {
          content: "";
          position: absolute;
          inset: 26px;
          background: white;
          border-radius: 999px;
          border: 1px solid var(--border);
        }
        .legend { display:flex; flex-direction: column; gap: 8px; }
        .legend-item { display:flex; align-items:center; justify-content: space-between; gap: 10px; font-weight: 900; }
        .dot { width: 10px; height: 10px; border-radius: 999px; }
        .muted { color: var(--muted); font-weight: 800; }

        @media print {
          @page { size: portrait; margin: 1cm; }
        }
      </style>
    </head>
    <body>
      <div class="topbar">
        <div class="brand">
          <img class="logo" src="${BRAND.logoUrl}" alt="Logo" />
          <div class="titlewrap">
            <p class="header">${escapeHtml(title)}</p>
            <div class="sub">${escapeHtml(subtitle)}</div>
          </div>
        </div>
        <div class="badge">EcoBúzios • Relatórios</div>
      </div>
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
            <td>${escapeHtml(r.name)}</td>
            <td class="num">${r.value}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td class="num"><strong>${escapeHtml(totalLabel)}:</strong></td>
          <td class="num"><strong>${total}</strong></td>
        </tr>
      </tfoot>
    </table>
  `;
}

function renderBars(rows: Pair[], maxItems = 10) {
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const list = sorted.slice(0, maxItems);
  const max = Math.max(1, ...list.map((r) => r.value));

  return `
    <div class="chart">
      <div class="chart-title">Gráfico (top ${maxItems})</div>
      <div class="bars">
        ${list
          .map((r) => {
            const pct = Math.round((r.value / max) * 100);
            return `
              <div class="bar-row">
                <div>
                  <div class="bar-label">${escapeHtml(r.name)}</div>
                  <div class="bar-track"><div class="bar-fill" style="width:${pct}%;"></div></div>
                </div>
                <div class="bar-value">${r.value}</div>
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderDonutSchoolType(rows: Pair[]) {
  const normalized = [
    { name: "Pública", value: rows.find((r) => r.name.toLowerCase().includes("pú"))?.value || 0, color: BRAND.primary },
    { name: "Privada", value: rows.find((r) => r.name.toLowerCase().includes("priv"))?.value || 0, color: BRAND.accent },
    { name: "Outros", value: rows.find((r) => r.name.toLowerCase().includes("out"))?.value || 0, color: "#60a5fa" },
  ].filter((x) => x.value > 0);

  const total = normalized.reduce((acc, cur) => acc + cur.value, 0) || 1;

  let start = 0;
  const stops = normalized
    .map((s) => {
      const deg = (s.value / total) * 360;
      const seg = `${s.color} ${start}deg ${start + deg}deg`;
      start += deg;
      return seg;
    })
    .join(", ");

  const legend = normalized
    .map(
      (s) => `
      <div class="legend-item">
        <div style="display:flex;align-items:center;gap:8px;min-width:0;">
          <span class="dot" style="background:${s.color}"></span>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(s.name)}</span>
        </div>
        <span>${s.value}</span>
      </div>`,
    )
    .join("");

  return `
    <div class="chart">
      <div class="chart-title">Gráfico</div>
      <div class="donut-wrap">
        <div class="donut" style="background: conic-gradient(${stops});"></div>
        <div>
          <div class="muted" style="margin-bottom:8px; font-size:10px; font-weight:900; letter-spacing:.12em; text-transform:uppercase;">Tipo de escola</div>
          <div class="legend">${legend}</div>
        </div>
      </div>
    </div>
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
    <div class="section card">
      <div class="card-head">
        <div class="card-title">Resumo visual</div>
        <div class="badge">Clique no ícone do navegador para imprimir</div>
      </div>
      <div class="pad">
        ${renderDonutSchoolType(params.rows)}
      </div>
    </div>

    <div class="section card">
      <div class="card-head">
        <div class="card-title">Tabela completa</div>
        <div class="badge">Total de alunos: ${params.studentCount}</div>
      </div>
      <div class="pad">
        ${renderSimpleTable(params.rows, "Total")}
        <div class="meta" style="margin-top:10px;">Observação: considera apenas alunos ativos vinculados às turmas ativas.</div>
      </div>
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
    <div class="section card">
      <div class="card-head">
        <div class="card-title">Resumo visual</div>
        <div class="badge">Top instituições</div>
      </div>
      <div class="pad">
        ${renderBars(params.rows, 12)}
      </div>
    </div>

    <div class="section card">
      <div class="card-head">
        <div class="card-title">Tabela completa</div>
        <div class="badge">Instituições: ${params.rows.length}</div>
      </div>
      <div class="pad">
        <div class="meta" style="margin-bottom:10px;">Contagem de alunos por instituição (escola/universidade).</div>
        ${renderSimpleTable(params.rows, "Total")}
      </div>
    </div>
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
    <div class="section card">
      <div class="card-head">
        <div class="card-title">Resumo visual</div>
        <div class="badge">Top bairros</div>
      </div>
      <div class="pad">
        ${renderBars(params.rows, 12)}
      </div>
    </div>

    <div class="section card">
      <div class="card-head">
        <div class="card-title">Tabela completa</div>
        <div class="badge">Bairros: ${params.rows.length}</div>
      </div>
      <div class="pad">
        <div class="meta" style="margin-bottom:10px;">Distribuição dos alunos por bairro.</div>
        ${renderSimpleTable(params.rows, "Total")}
      </div>
    </div>
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
    <div class="section card">
      <div class="card-head">
        <div class="card-title">Resumo visual</div>
        <div class="badge">Chamadas por turma</div>
      </div>
      <div class="pad">
        ${renderBars(rows, 10)}
      </div>
    </div>

    <div class="section card">
      <div class="card-head">
        <div class="card-title">Tabela</div>
        <div class="badge">Total: ${params.sessions.length}</div>
      </div>
      <div class="pad">
        <div class="meta" style="margin-bottom:10px;">Chamadas por turma (classId). (Pode ser melhorado para mostrar nome da turma.)</div>
        ${renderSimpleTable(rows, "Total")}
      </div>
    </div>
  `;

  openPrintWindow(title, subtitle, body);
}