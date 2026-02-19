import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AttendanceStatus } from "@/types/attendance";

export type AttendanceMatrix = {
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

export function generateAttendancePdf(matrix: AttendanceMatrix) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  const title = "Relatório de Chamada";
  const subtitle = `Turma: ${matrix.className} • ${monthLabel(matrix.month)}`;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, 40, 40);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(subtitle, 40, 60);

  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text("Legenda: P=Presente • A=Atrasado • F=Falta • J=Justificada • (em branco = aluno não estava na turma na data)", 40, 78);
  doc.setTextColor(0, 0, 0);

  const head = [["Aluno", ...matrix.dates.map((d) => formatDatePt(d))]];

  const body = matrix.students.map((st) => {
    const row: string[] = [];
    row.push(`${displaySocialName(st)}\n${st.fullName}`);

    for (const date of matrix.dates) {
      const isMember = matrix.membershipByStudentByDate[st.id]?.[date];
      if (!isMember) {
        row.push("");
        continue;
      }
      const status = matrix.statusByStudentByDate[st.id]?.[date];
      row.push(statusShort(status));
    }

    return row;
  });

  autoTable(doc, {
    startY: 95,
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
      fillColor: [243, 244, 246],
      textColor: [17, 24, 39],
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