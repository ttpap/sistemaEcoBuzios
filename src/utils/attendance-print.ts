import { AttendanceStatus } from "@/types/attendance";

type AttendanceMatrix = {
  className: string;
  month: string; // YYYY-MM
  dates: string[]; // YYYY-MM-DD sorted
  students: Array<{ id: string; fullName: string; socialName?: string; preferredName?: string }>;
  statusByStudentByDate: Record<string, Record<string, AttendanceStatus | undefined>>;
  membershipByStudentByDate: Record<string, Record<string, boolean>>;
};

function monthLabel(month: string) {
  const [y, m] = month.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(d);
}

function formatDatePt(ymd: string) {
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}`;
}

function displaySocialName(st: AttendanceMatrix["students"][number]) {
  return st.socialName || st.preferredName || st.fullName;
}

function statusLabel(s?: AttendanceStatus) {
  switch (s) {
    case "presente":
      return "Presente";
    case "atrasado":
      return "Atrasado";
    case "falta":
      return "Falta";
    case "justificada":
      return "Justificada";
    default:
      return "";
  }
}

export function printAttendanceReport(matrix: AttendanceMatrix) {
  const w = window.open("", "_blank");
  if (!w) return;

  const html = `
  <html>
    <head>
      <title>Relatório de Chamada</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 10px; margin: 20px; color: #111827; }
        .header { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; }
        .title { font-size: 14px; font-weight: 800; }
        .meta { font-size: 11px; font-weight: 700; color: #374151; }
        .legend { margin-top: 10px; font-size: 10px; color: #6b7280; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #111827; padding: 5px 6px; }
        th { background: #f3f4f6; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; font-size: 9px; }
        td { vertical-align: top; }
        .name { font-weight: 800; }
        .sub { font-size: 9px; color: #6b7280; font-weight: 700; }
        .center { text-align: center; }
        @media print {
          @page { size: landscape; margin: 1cm; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">RELATÓRIO DE CHAMADA</div>
        <div class="meta">Turma: ${matrix.className} • ${monthLabel(matrix.month)}</div>
      </div>
      <div class="legend">
        Status: Presente | Atrasado | Falta | Justificada • "—" = aluno não estava na turma nessa data
      </div>
      <table>
        <thead>
          <tr>
            <th>Aluno</th>
            ${matrix.dates.map((d) => `<th class="center">${formatDatePt(d)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${matrix.students
            .map((st) => {
              const cells = matrix.dates
                .map((date) => {
                  const isMember = matrix.membershipByStudentByDate[st.id]?.[date];
                  if (!isMember) return `<td class="center">—</td>`;
                  const status = matrix.statusByStudentByDate[st.id]?.[date];
                  return `<td class="center">${statusLabel(status) || ""}</td>`;
                })
                .join("");
              return `
                <tr>
                  <td>
                    <div class="name">${displaySocialName(st)}</div>
                    <div class="sub">${st.fullName}</div>
                  </td>
                  ${cells}
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </body>
  </html>`;

  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
  }, 200);
}
