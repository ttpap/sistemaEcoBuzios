export type EscolaPrintStudent = { name: string; full: string };
export type EscolaPrintClass = { className: string; students: EscolaPrintStudent[] };
export type EscolaPrintSchool = {
  school: string;
  classes: EscolaPrintClass[];
  totalStudents: number;
  totalClasses: number;
};

function escapeHtml(input: string) {
  return String(input || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function printEscolaReport(input: {
  projectName: string;
  totals: { escolas: number; turmas: number; alunos: number };
  grouped: EscolaPrintSchool[];
}) {
  const w = window.open("", "_blank");
  if (!w) return;

  const today = new Date().toLocaleDateString("pt-BR");

  const schoolsHtml = input.grouped
    .map((sc) => {
      const classesHtml = sc.classes
        .map((cl) => {
          const rows = cl.students
            .map(
              (st) =>
                `<li><strong>${escapeHtml(st.full)}</strong>${
                  st.name && st.name !== st.full
                    ? ` <span class="apelido">(${escapeHtml(st.name)})</span>`
                    : ""
                }</li>`,
            )
            .join("");
          return `
            <div class="turma">
              <div class="turma-head">${escapeHtml(cl.className)} <span class="count">${cl.students.length} aluno(s)</span></div>
              <ol class="alunos">${rows}</ol>
            </div>`;
        })
        .join("");

      return `
        <section class="escola">
          <div class="escola-head">
            <div class="escola-name">${escapeHtml(sc.school)}</div>
            <div class="escola-meta">${sc.totalStudents} aluno(s) • ${sc.totalClasses} turma(s)</div>
          </div>
          ${classesHtml}
        </section>`;
    })
    .join("");

  const html = `
  <html>
    <head>
      <title>Relatório de Escolas</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; margin: 22px; color: #111827; }
        .header { border-bottom: 2px solid #111827; padding-bottom: 10px; margin-bottom: 14px; }
        .title { font-size: 16px; font-weight: 900; letter-spacing: .01em; }
        .meta { font-size: 11px; font-weight: 700; color: #374151; margin-top: 4px; }
        .totals { font-size: 11px; font-weight: 700; color: #111827; margin-top: 6px; }
        .escola { margin-bottom: 16px; page-break-inside: avoid; }
        .escola-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px;
          background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; padding: 6px 10px; }
        .escola-name { font-size: 13px; font-weight: 900; }
        .escola-meta { font-size: 10px; font-weight: 700; color: #374151; white-space: nowrap; }
        .turma { margin: 8px 0 8px 6px; page-break-inside: avoid; }
        .turma-head { font-size: 11px; font-weight: 900; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; margin-bottom: 4px; }
        .turma-head .count { font-weight: 700; color: #6b7280; font-size: 10px; }
        ol.alunos { margin: 0; padding-left: 22px; }
        ol.alunos li { padding: 1px 0; }
        .apelido { color: #94a3b8; font-style: italic; font-weight: 400; }
        @media print { @page { margin: 1.2cm; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">RELATÓRIO DE ESCOLAS</div>
        <div class="meta">Projeto: ${escapeHtml(input.projectName)} • Emitido em ${escapeHtml(today)}</div>
        <div class="totals">${input.totals.escolas} escola(s) • ${input.totals.turmas} turma(s) • ${input.totals.alunos} aluno(s)</div>
      </div>
      ${schoolsHtml || '<p style="color:#6b7280;font-weight:700">Nenhum aluno para os filtros selecionados.</p>'}
    </body>
  </html>`;

  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 200);
}
