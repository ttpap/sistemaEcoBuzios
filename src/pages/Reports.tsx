"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SchoolClass } from "@/types/class";
import { StudentRegistration } from "@/types/student";
import { AttendanceStatus } from "@/types/attendance";
import type { AttendanceSession } from "@/types/attendance";
import { fetchAttendanceSessionsRemote } from "@/services/attendanceService";

import { isStudentEnrolledOn, ensureStudentEnrollments } from "@/utils/class-enrollment";
import { generateAttendancePdf, AttendanceMatrix } from "@/utils/attendance-pdf";
import { downloadAttendanceXls } from "@/utils/attendance-xls";
import { showError } from "@/utils/toast";
import { readGlobalStudents, readScoped, writeGlobalStudents, writeScoped } from "@/utils/storage";
import { getActiveProject, getActiveProjectId, saveProjects, setActiveProjectId } from "@/utils/projects";
import { fetchClassesRemoteWithMeta, fetchEnrollmentsRemoteWithMeta, fetchProjectNucleosRemote } from "@/services/classesService";
import { fetchStudentsRemoteWithMeta } from "@/services/studentsService";
import { projectsService } from "@/services/projectsService";

import { getSystemLogo } from "@/utils/system-settings";
import { getAreaBaseFromPathname } from "@/utils/route-base";
import { useAuth } from "@/context/AuthContext";
import { getCoordinatorSessionLogin } from "@/utils/coordinator-auth";
import { Zap } from "lucide-react";

import {
  BarChart3,
  Building2,
  CalendarDays,
  FileDown,
  FileSpreadsheet,
  Printer,
  ClipboardCheck,
  ArrowLeft,
  Layers,
  NotebookPen,
  Users,
  FileText,
} from "lucide-react";

function parseTimeHours(t: string): number {
  const parts = t.split(":").map(Number);
  return (parts[0] || 0) + (parts[1] || 0) / 60;
}

const DEFAULT_LOGO = "https://files.dyad.sh/pasted-image-2026-02-19T16-19-18-020Z.png";

function getReportLogoUrl(): string {
  const projectLogo = getActiveProject()?.imageUrl;
  return projectLogo || getSystemLogo() || DEFAULT_LOGO;
}

function getReportProjectName(): string {
  return getActiveProject()?.name || "EcoBúzios";
}

function monthLabel(month: string) {
  const [y, m] = month.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(d);
}

function formatDateCol(ymd: string) {
  const [, m, d] = ymd.split("-");
  return `${d}/${m}`;
}

function displaySocialName(s: StudentRegistration) {
  return s.socialName || s.preferredName || s.fullName;
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

function statusPill(s?: AttendanceStatus) {
  if (!s) return null;
  const base = "inline-flex h-8 min-w-8 items-center justify-center rounded-2xl px-2 text-xs font-black border";
  switch (s) {
    case "presente":
      return <span className={cn(base, "bg-emerald-600 text-white border-emerald-600")}>P</span>;
    case "atrasado":
      return <span className={cn(base, "bg-amber-600 text-white border-amber-600")}>A</span>;
    case "falta":
      return <span className={cn(base, "bg-rose-600 text-white border-rose-600")}>F</span>;
    case "justificada":
      return <span className={cn(base, "bg-sky-600 text-white border-sky-600")}>J</span>;
    default:
      return null;
  }
}

function printAttendanceReport(matrix: AttendanceMatrix) {
  const win = window.open("", "_blank");
  if (!win) return;

  const logoUrl = getReportLogoUrl();
  const projectName = getReportProjectName();

  const title = `RELATÓRIO DE CHAMADA`;
  const subtitle = `Turma: ${matrix.className} • ${monthLabel(matrix.month)}`;
  const generatedAt = new Date().toLocaleString("pt-BR");

  const html = `
  <html>
    <head>
      <title>Relatório de Chamada</title>
      <style>
        :root {
          --primary: #008ca0;
          --accent: #ffa534;
          --slate: #0f172a;
          --muted: #64748b;
          --border: #e2e8f0;
          --soft: #f8fafc;
        }

        * { box-sizing: border-box; }
        body { font-family: Inter, Arial, sans-serif; font-size: 10px; margin: 18px; color: var(--slate); }

        .sheet-header {
          border: 1px solid var(--border);
          border-radius: 22px;
          background: #fff;
          overflow: hidden;
        }
        .brandbar { height: 8px; background: var(--primary); }
        .header-inner { padding: 14px 16px 12px; }
        .toprow { display:flex; align-items:center; justify-content: space-between; gap: 14px; }
        .brand { display:flex; align-items:center; gap: 12px; min-width: 0; }
        .logo { height: 44px; width: auto; object-fit: contain; display:block; }
        .titlewrap { min-width: 0; }
        .proj { font-size: 10px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
        .header { font-weight: 950; font-size: 15px; margin: 3px 0 0; letter-spacing: -0.02em; }
        .sub { font-size: 11px; margin-top: 4px; color: #334155; font-weight: 850; }

        .chip {
          display:inline-flex;
          align-items:center;
          gap: 8px;
          border-radius: 999px;
          padding: 6px 10px;
          font-weight: 900;
          font-size: 10px;
          border: 1px solid rgba(0, 140, 160, 0.22);
          background: rgba(0, 140, 160, 0.08);
          color: var(--primary);
          white-space: nowrap;
        }
        .meta {
          margin-top: 10px;
          display:flex;
          align-items:center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 16px;
          background: var(--soft);
          border: 1px solid var(--border);
          color: #334155;
          font-weight: 800;
        }
        .legend { margin: 12px 2px 12px; font-size: 10px; color: var(--muted); font-weight: 750; }

        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #0f172a; padding: 5px 6px; vertical-align: top; }
        th { background: #f1f5f9; text-align: center; font-weight: 950; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; }
        td.name { width: 260px; }
        .social { font-weight: 950; }
        .full { color: #475569; font-weight: 800; font-size: 9px; margin-top: 2px; }
        .center { text-align: center; font-weight: 950; }

        @media print {
          @page { size: landscape; margin: 1cm; }
        }
      </style>
    </head>
    <body>
      <div class="sheet-header">
        <div class="brandbar"></div>
        <div class="header-inner">
          <div class="toprow">
            <div class="brand">
              <img class="logo" src="${logoUrl}" alt="Logo" />
              <div class="titlewrap">
                <div class="proj">${projectName}</div>
                <p class="header">${title}</p>
                <div class="sub">${subtitle}</div>
              </div>
            </div>
            <div class="chip">EcoBúzios • Chamada</div>
          </div>

          <div class="meta">
            <div>Gerado em <strong>${generatedAt}</strong></div>
            <div>Status: <strong>P</strong>=Presente • <strong>A</strong>=Atrasado • <strong>F</strong>=Falta • <strong>J</strong>=Justificada • <strong>—</strong>=não estava na turma</div>
          </div>
        </div>
      </div>

      <div class="legend">Dica: você pode gerar PDF ou XLS para arquivar mensalmente.</div>

      <table>
        <thead>
          <tr>
            <th style="text-align:left">Aluno</th>
            ${matrix.dates.map((d) => `<th>${formatDateCol(d)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${matrix.students
            .map((st) => {
              const name = `${st.socialName || st.preferredName || st.fullName}`;
              const full = st.fullName;
              const tds = matrix.dates
                .map((d) => {
                  const isMember = matrix.membershipByStudentByDate[st.id]?.[d];
                  if (!isMember) return `<td class="center">—</td>`;
                  const s = matrix.statusByStudentByDate[st.id]?.[d];
                  return `<td class="center">${statusShort(s)}</td>`;
                })
                .join("");
              return `<tr><td class="name"><div class="social">${name}</div><div class="full">${full}</div></td>${tds}</tr>`;
            })
            .join("")}
        </tbody>
      </table>
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

async function downloadClassesYearPdf(
  rows: { classId: string; name: string; period: string; total: number; byMonth: Record<string, number> }[],
  months: string[],
  grandTotal: number,
  yearFilter: string,
) {
  const jsPDF = (await import("jspdf")).default;
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Load logo
  const logoUrl = getReportLogoUrl();
  let logoDataUrl: string | null = null;
  let logoAspect = 1;
  try {
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          logoAspect = w / h;
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (ctx) { ctx.drawImage(img, 0, 0); logoDataUrl = canvas.toDataURL("image/png"); }
        } catch { /* ignore */ }
        resolve();
      };
      img.onerror = () => resolve();
      img.src = logoUrl;
    });
  } catch { /* ignore */ }

  // Header bar
  doc.setFillColor(0, 140, 160);
  doc.rect(0, 0, pageW, 12, "F");

  // Logo in header area
  const logoH = 14;
  const logoW = logoH * logoAspect;
  const textX = logoDataUrl ? 14 + logoW + 4 : 14;
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", 14, 14, logoW, logoH);
  }

  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(`AULAS REALIZADAS — ${yearFilter}`, textX, 22);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.text(`${getReportProjectName()} · ${grandTotal} aulas · ${grandTotal * 2}h · Gerado em ${new Date().toLocaleString("pt-BR")}`, textX, 29);

  const monthLabels = months.map((m) => {
    const d = new Date(m + "-15");
    return d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase();
  });

  const head = [["Turma", "Período", ...monthLabels, "Aulas", "Horas"]];
  const body = rows.map((row) => [
    row.name,
    row.period,
    ...months.map((m) => (row.byMonth[m] ?? "—").toString()),
    row.total.toString(),
    `${row.total * 2}h`,
  ]);
  // Total row
  body.push([
    "TOTAL",
    "",
    ...months.map((m) => (rows.reduce((s, r) => s + (r.byMonth[m] ?? 0), 0) || "—").toString()),
    grandTotal.toString(),
    `${grandTotal * 2}h`,
  ]);

  autoTable(doc, {
    head,
    body,
    startY: 35,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [0, 140, 160], textColor: 255, fontStyle: "bold", halign: "center" },
    columnStyles: {
      0: { halign: "left", cellWidth: 40 },
      1: { halign: "left", cellWidth: 22 },
      [head[0].length - 2]: { halign: "center", fontStyle: "bold" },
      [head[0].length - 1]: { halign: "center", fontStyle: "bold", textColor: [5, 150, 105] },
    },
    didParseCell: (data) => {
      // Style last row (total)
      if (data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });

  doc.save(`aulas-realizadas-${yearFilter}.pdf`);
}

function printClassesYearReport(
  rows: { classId: string; name: string; period: string; total: number; byMonth: Record<string, number> }[],
  months: string[],
  grandTotal: number,
  yearFilter: string,
) {
  const win = window.open("", "_blank");
  if (!win) return;

  const logoUrl = getReportLogoUrl();
  const projectName = getReportProjectName();
  const generatedAt = new Date().toLocaleString("pt-BR");

  const monthLabels = months.map((m) => {
    const d = new Date(m + "-15");
    return d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  });

  const headerCols = monthLabels.map((ml) => `<th>${ml.toUpperCase()}</th>`).join("");
  const bodyRows = rows.map((row) => {
    const monthCells = months.map((m) => `<td class="center">${row.byMonth[m] ?? "—"}</td>`).join("");
    return `<tr>
      <td class="name"><div class="cls">${row.name}</div>${row.period ? `<div class="period">${row.period}</div>` : ""}</td>
      ${monthCells}
      <td class="center bold">${row.total}</td>
      <td class="center hours">${row.total * 2}h</td>
    </tr>`;
  }).join("");

  const totalCells = months.map((m) => {
    const sum = rows.reduce((s, r) => s + (r.byMonth[m] ?? 0), 0);
    return `<td class="center bold">${sum || "—"}</td>`;
  }).join("");

  const html = `<html>
    <head>
      <title>Aulas Realizadas ${yearFilter}</title>
      <style>
        :root { --primary: #008ca0; --slate: #0f172a; --muted: #64748b; --border: #e2e8f0; --soft: #f8fafc; }
        * { box-sizing: border-box; }
        body { font-family: Inter, Arial, sans-serif; font-size: 10px; margin: 18px; color: var(--slate); }
        .sheet-header { border: 1px solid var(--border); border-radius: 22px; background: #fff; overflow: hidden; margin-bottom: 16px; }
        .brandbar { height: 8px; background: var(--primary); }
        .header-inner { padding: 14px 16px 12px; }
        .toprow { display:flex; align-items:center; justify-content: space-between; gap: 14px; }
        .brand { display:flex; align-items:center; gap: 12px; }
        .logo { height: 44px; width: auto; object-fit: contain; }
        .proj { font-size: 10px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
        .header { font-weight: 950; font-size: 15px; margin: 3px 0 0; letter-spacing: -0.02em; }
        .sub { font-size: 11px; margin-top: 4px; color: #334155; font-weight: 850; }
        .chip { display:inline-flex; align-items:center; border-radius: 999px; padding: 6px 10px; font-weight: 900; font-size: 10px; border: 1px solid rgba(0,140,160,0.22); background: rgba(0,140,160,0.08); color: var(--primary); white-space: nowrap; }
        .meta { margin-top: 10px; display:flex; align-items:center; justify-content: space-between; padding: 10px 12px; border-radius: 16px; background: var(--soft); border: 1px solid var(--border); color: #334155; font-weight: 800; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: middle; }
        th { background: #f1f5f9; text-align: center; font-weight: 950; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; }
        th.left { text-align: left; }
        td.name { width: 220px; }
        .cls { font-weight: 900; }
        .period { color: #94a3b8; font-size: 9px; margin-top: 1px; }
        .center { text-align: center; }
        .bold { font-weight: 900; }
        .hours { font-weight: 900; color: #059669; }
        tr.total { background: #f8fafc; border-top: 2px solid #cbd5e1; }
        tr.total td { font-weight: 900; }
        @media print { @page { size: landscape; margin: 1cm; } }
      </style>
    </head>
    <body>
      <div class="sheet-header">
        <div class="brandbar"></div>
        <div class="header-inner">
          <div class="toprow">
            <div class="brand">
              <img class="logo" src="${logoUrl}" alt="Logo" />
              <div>
                <div class="proj">${projectName}</div>
                <p class="header">AULAS REALIZADAS — ${yearFilter}</p>
                <div class="sub">${grandTotal} aulas · ${grandTotal * 2}h no total</div>
              </div>
            </div>
            <div class="chip">EcoBúzios • Relatório Anual</div>
          </div>
          <div class="meta">
            <div>Gerado em <strong>${generatedAt}</strong></div>
            <div>Fonte: aulas finalizadas na chamada</div>
          </div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th class="left">Turma</th>
            ${headerCols}
            <th>Aulas</th>
            <th>Horas</th>
          </tr>
        </thead>
        <tbody>
          ${bodyRows}
          <tr class="total">
            <td class="name bold">TOTAL</td>
            ${totalCells}
            <td class="center bold">${grandTotal}</td>
            <td class="center hours">${grandTotal * 2}h</td>
          </tr>
        </tbody>
      </table>
    </body>
  </html>`;

  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 250);
}

function printPrefeituraReport(data: {
  projectName: string;
  total: number;
  schoolTypes: { label: string; count: number; color: string }[];
  ageGroups: { label: string; count: number }[];
  hoursRows: { name: string; period: string; sessions: number; hours: number }[];
  totalSessions: number;
  totalHours: number;
}) {
  const win = window.open("", "_blank");
  if (!win) return;

  const logoUrl = getReportLogoUrl();
  const generatedAt = new Date().toLocaleString("pt-BR");
  const { projectName, total, schoolTypes, ageGroups, hoursRows, totalSessions, totalHours } = data;

  const schoolRows = schoolTypes.map((st) => {
    const pct = total > 0 ? ((st.count / total) * 100).toFixed(1) : "0.0";
    return `<tr>
      <td style="padding:7px 10px;font-weight:800;color:#1e293b;">${st.label}</td>
      <td style="text-align:center;padding:7px 10px;font-weight:900;color:#1e293b;">${st.count}</td>
      <td style="text-align:center;padding:7px 10px;font-weight:900;color:${st.color};">${pct}%</td>
    </tr>`;
  }).join("");

  const ageRows = ageGroups.filter(g => g.count > 0).map((g) => {
    const pct = total > 0 ? ((g.count / total) * 100).toFixed(1) : "0.0";
    return `<tr>
      <td style="padding:7px 10px;font-weight:800;color:#1e293b;">${g.label}</td>
      <td style="text-align:center;padding:7px 10px;font-weight:900;color:#1e293b;">${g.count}</td>
      <td style="text-align:center;padding:7px 10px;font-weight:900;color:#6366f1;">${pct}%</td>
    </tr>`;
  }).join("");

  const classRows = hoursRows.map((r) => `<tr>
    <td style="padding:7px 10px;font-weight:800;color:#1e293b;">${r.name}${r.period ? ` <span style="color:#94a3b8;font-size:9px;">${r.period}</span>` : ""}</td>
    <td style="text-align:center;padding:7px 10px;font-weight:900;color:#059669;">${r.sessions}</td>
  </tr>`).join("");

  const html = `<html>
  <head>
    <title>Relatório Prefeitura — ${projectName}</title>
    <style>
      :root { --primary: #008ca0; --indigo: #6366f1; --slate: #0f172a; --muted: #64748b; --border: #e2e8f0; --soft: #f8fafc; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Inter, Arial, sans-serif; font-size: 10px; margin: 18px; color: var(--slate); }
      .sheet-header { border: 1px solid var(--border); border-radius: 22px; background: #fff; overflow: hidden; margin-bottom: 16px; }
      .brandbar { height: 8px; background: var(--primary); }
      .header-inner { padding: 14px 16px 12px; }
      .toprow { display:flex; align-items:center; justify-content:space-between; gap:14px; }
      .brand { display:flex; align-items:center; gap:12px; }
      .logo { height:44px; width:auto; object-fit:contain; }
      .proj { font-size:10px; font-weight:900; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); }
      .title { font-weight:950; font-size:15px; margin:3px 0 0; letter-spacing:-0.02em; }
      .meta { margin-top:10px; display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-radius:16px; background:var(--soft); border:1px solid var(--border); color:#334155; font-weight:800; }
      .grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px; }
      .section { border:1px solid var(--border); border-radius:16px; overflow:hidden; background:#fff; }
      .section-title { padding:10px 14px; font-weight:950; font-size:11px; text-transform:uppercase; letter-spacing:.1em; background:var(--soft); border-bottom:1px solid var(--border); color:var(--primary); }
      .total-box { padding:18px 14px; text-align:center; }
      .total-num { font-size:42px; font-weight:950; color:var(--primary); line-height:1; }
      .total-label { font-size:11px; font-weight:800; color:var(--muted); margin-top:4px; }
      table { width:100%; border-collapse:collapse; }
      th { background:#f1f5f9; text-align:center; font-weight:950; font-size:9px; text-transform:uppercase; letter-spacing:.08em; padding:7px 10px; border-bottom:1px solid var(--border); }
      th.left { text-align:left; }
      tr + tr td { border-top:1px solid #f1f5f9; }
      tr.foot td { border-top:2px solid #cbd5e1; font-weight:950; background:#f8fafc; }
      @media print { @page { size: portrait; margin: 1cm; } }
    </style>
  </head>
  <body>
    <div class="sheet-header">
      <div class="brandbar"></div>
      <div class="header-inner">
        <div class="toprow">
          <div class="brand">
            <img class="logo" src="${logoUrl}" alt="Logo" />
            <div>
              <div class="proj">${projectName}</div>
              <div class="title">RELATÓRIO PREFEITURA</div>
            </div>
          </div>
          <div style="display:inline-flex;align-items:center;border-radius:999px;padding:6px 10px;font-weight:900;font-size:10px;border:1px solid rgba(0,140,160,0.22);background:rgba(0,140,160,0.08);color:var(--primary);">Dados do Projeto</div>
        </div>
        <div class="meta">
          <div>Gerado em <strong>${generatedAt}</strong></div>
          <div>Total de alunos: <strong>${total}</strong></div>
        </div>
      </div>
    </div>

    <div class="grid">
      <div>
        <div class="section" style="margin-bottom:14px;">
          <div class="section-title">Total de Alunos no Projeto</div>
          <div class="total-box">
            <div class="total-num">${total}</div>
            <div class="total-label">alunos matriculados</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Distribuição por Rede de Ensino</div>
          <table>
            <thead><tr><th class="left">Rede</th><th>Alunos</th><th>%</th></tr></thead>
            <tbody>${schoolRows}</tbody>
          </table>
        </div>
      </div>

      <div>
        <div class="section" style="margin-bottom:14px;">
          <div class="section-title">Faixas Etárias</div>
          <table>
            <thead><tr><th class="left">Faixa</th><th>Alunos</th><th>%</th></tr></thead>
            <tbody>${ageRows}</tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">Aulas Dadas por Turma</div>
          <table>
            <thead><tr><th class="left">Turma</th><th>Aulas</th></tr></thead>
            <tbody>
              ${classRows}
              <tr class="foot">
                <td style="padding:7px 10px;">TOTAL</td>
                <td style="text-align:center;padding:7px 10px;color:#059669;font-weight:900;">${totalSessions}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </body>
</html>`;

  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 250);
}

export default function Reports() {
  const navigate = useNavigate();
  const location = useLocation();
  const base = useMemo(() => getAreaBaseFromPathname(location.pathname), [location.pathname]);
  const isTeacherArea = useMemo(() => location.pathname.startsWith("/professor"), [location.pathname]);

  const { profile } = useAuth();
  const canSeeEnel =
    profile?.role === "admin" ||
    profile?.role === "coordinator" ||
    Boolean(getCoordinatorSessionLogin());

  const [report, setReport] = useState<"home" | "attendance" | "classes-year" | "prefeitura">("home");
  const [yearFilter, setYearFilter] = useState<string>(String(new Date().getFullYear()));
  const [prefeituraYear, setPrefeituraYear] = useState<string>(String(new Date().getFullYear()));
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<StudentRegistration[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);

  const ALL = "__all__";
  const [classId, setClassId] = useState<string>(ALL);

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState<string>(defaultMonth);

  useEffect(() => {
    const run = async () => {
      // Primeiro: carrega cache local
      setClasses(readScoped<SchoolClass[]>("classes", []));
      setStudents(readGlobalStudents<StudentRegistration[]>([]));

      // Em domínio novo/localStorage vazio, pode não existir projeto ativo ainda.
      // Para não bloquear relatórios, hidratamos a lista do banco e setamos um projeto padrão.
      if (!getActiveProjectId() || !getActiveProject()) {
        try {
          const prjs = await projectsService.fetchProjectsFromDb();
          if (prjs.length) {
            saveProjects(prjs);
            if (!getActiveProjectId()) setActiveProjectId(prjs[0]!.id);
          }
        } catch {
          // Se falhar, seguimos com cache local; a UI já mostra "Selecione um projeto".
        }
      }

      const activeProjectId = getActiveProject()?.id ?? getActiveProjectId();
      if (activeProjectId) {
        try {
          // Atualiza classes + matrículas + alunos do servidor (necessário no modo B)
          const classRes = await fetchClassesRemoteWithMeta(activeProjectId);
          const parentClasses = classRes.classes.length
            ? classRes.classes
            : readScoped<SchoolClass[]>("classes", []);

          // Núcleos (subturmas) também entram como opção no filtro de relatórios.
          let nucleos: SchoolClass[] = [];
          try {
            nucleos = await fetchProjectNucleosRemote(activeProjectId);
          } catch {
            nucleos = [];
          }
          const baseClasses = [...parentClasses, ...nucleos];

          const enriched: SchoolClass[] = [];
          for (const c of baseClasses) {
            const enr = await fetchEnrollmentsRemoteWithMeta(c.id);

            const studentEnrollments = (enr.enrollments || []).map((e) => ({
              studentId: e.student_id,
              enrolledAt: e.enrolled_at,
              removedAt: e.removed_at ?? undefined,
            }));

            const studentIds = (enr.enrollments || [])
              .filter((e) => !e.removed_at)
              .map((e) => e.student_id);

            enriched.push({ ...c, studentIds, studentEnrollments });
          }

          writeScoped("classes", enriched);
          setClasses(enriched);

          const stuRes = await fetchStudentsRemoteWithMeta(activeProjectId);
          if (stuRes.students.length) {
            writeGlobalStudents(stuRes.students);
            setStudents(stuRes.students);
          }

          const remote = await fetchAttendanceSessionsRemote(activeProjectId);
          setAttendanceSessions(remote);
        } catch (e: any) {
          showError(e?.message || "Não foi possível carregar os dados do relatório.");
          setAttendanceSessions([]);
        }
      } else {
        setAttendanceSessions([]);
      }
    };

    void run();
  }, []);

  const monthParts = month.split("-");
  const selectedYear = monthParts[0] || String(now.getFullYear());
  const selectedMonthPart = monthParts[1] || String(now.getMonth() + 1).padStart(2, "0");

  const sessionsForClass = useCallback(
    (classId: string) => attendanceSessions.filter((s) => s.classId === classId),
    [attendanceSessions],
  );

  const classesWithCounts = useMemo(() => {
    return classes
      .map((c) => ensureStudentEnrollments(c))
      .map((c) => {
        const enrolled = c.studentIds?.length || 0;
        const sessionsInMonth = sessionsForClass(c.id).filter((s) => s.date.startsWith(month));
        const dates = Array.from(new Set(sessionsInMonth.map((s) => s.date))).sort((a, b) => a.localeCompare(b));
        return {
          cls: c,
          studentsCount: enrolled,
          callDaysCount: dates.length,
        };
      })
      .sort((a, b) => a.cls.name.localeCompare(b.cls.name, "pt-BR"));
  }, [classes, month, sessionsForClass]);

  const totalStudentsInClasses = useMemo(() => {
    const ids = new Set<string>();
    for (const c of classes) for (const sid of c.studentIds || []) ids.add(sid);
    return ids.size;
  }, [classes]);

  const selectedClass = useMemo(() => {
    if (classId === ALL) return null;
    const c = classes.find((x) => x.id === classId);
    return c ? ensureStudentEnrollments(c) : null;
  }, [classes, classId]);

  const matrix = useMemo((): AttendanceMatrix | null => {
    if (!selectedClass || !month) return null;

    const sessions = sessionsForClass(selectedClass.id).filter((s) => s.date.startsWith(month));
    const dates = Array.from(new Set(sessions.map((s) => s.date))).sort((a, b) => a.localeCompare(b));
    if (dates.length === 0)
      return {
        className: selectedClass.name,
        month,
        dates: [],
        students: [],
        statusByStudentByDate: {},
        membershipByStudentByDate: {},
      };

    const everIds = new Set<string>([
      ...(selectedClass.studentEnrollments || []).map((e) => e.studentId),
      ...(selectedClass.studentIds || []),
    ]);

    const allStudents = students.filter((s) => everIds.has(s.id));

    const membershipByStudentByDate: AttendanceMatrix["membershipByStudentByDate"] = {};
    const statusByStudentByDate: AttendanceMatrix["statusByStudentByDate"] = {};

    for (const st of allStudents) {
      membershipByStudentByDate[st.id] = {};
      statusByStudentByDate[st.id] = {};

      for (const date of dates) {
        const isMember = isStudentEnrolledOn(selectedClass, st.id, date);
        membershipByStudentByDate[st.id][date] = isMember;

        if (!isMember) {
          statusByStudentByDate[st.id][date] = undefined;
          continue;
        }

        const sess = sessions.find((x) => x.date === date);
        statusByStudentByDate[st.id][date] = sess?.records?.[st.id];
      }
    }

    const studentsInMonth = allStudents
      .filter((st) => dates.some((d) => membershipByStudentByDate[st.id]?.[d]))
      .sort((a, b) => displaySocialName(a).localeCompare(displaySocialName(b), "pt-BR"));

    return {
      className: selectedClass.name,
      month,
      dates,
      students: studentsInMonth.map((s) => ({
        id: s.id,
        fullName: s.fullName,
        socialName: s.socialName,
        preferredName: s.preferredName,
      })),
      statusByStudentByDate,
      membershipByStudentByDate,
    };
  }, [
    selectedClass?.id,
    selectedClass?.studentIds?.join(","),
    selectedClass?.studentEnrollments?.length,
    month,
    students,
  ]);

  const yearOptions = useMemo(() => {
    const y = now.getFullYear();
    return [y - 1, y, y + 1].map(String);
  }, []);

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, i) => {
        const m = String(i + 1).padStart(2, "0");
        return {
          value: m,
          label: new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(2020, i, 1)),
        };
      }),
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Relatórios</h1>
          <p className="text-slate-500 font-medium">Visão consolidada para conferência e impressão.</p>
        </div>
      </div>

      {report === "home" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card
            className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden cursor-pointer group"
            onClick={() => setReport("attendance")}
          >
            <CardContent className="p-8">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-3xl bg-primary/10 text-primary flex items-center justify-center border border-primary/15 group-hover:scale-110 transition-transform">
                  <FileText className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Relatório</p>
                  <p className="text-lg font-black text-primary">Relatório de chamada</p>
                  <p className="text-sm font-bold text-slate-500 mt-1">
                    Gere um relatório com todas as datas registradas no mês e o status de cada aluno.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden cursor-pointer group"
            onClick={() => setReport("classes-year")}
          >
            <CardContent className="p-8">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-3xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 group-hover:scale-110 transition-transform">
                  <BarChart3 className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Relatório</p>
                  <p className="text-lg font-black text-primary">Aulas Dadas no Ano</p>
                  <p className="text-sm font-bold text-slate-500 mt-1">
                    Total de aulas realizadas por turma no ano, com carga horária (2h por aula).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {canSeeEnel ? (
            <Card
              className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden cursor-pointer group"
              onClick={() => navigate(`${base}/relatorios/enel`)}
            >
              <CardContent className="p-8">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-3xl bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-200 group-hover:scale-110 transition-transform">
                    <Zap className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Relatório</p>
                    <p className="text-lg font-black text-primary">Relatório ENEL</p>
                    <p className="text-sm font-bold text-slate-500 mt-1">
                      Lista mensal de alunos matriculados nas turmas do projeto, com CPF e Nº ENEL.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card
            className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden cursor-pointer group"
            onClick={() => setReport("prefeitura")}
          >
            <CardContent className="p-8">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-3xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200 group-hover:scale-110 transition-transform">
                  <Building2 className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Relatório</p>
                  <p className="text-lg font-black text-primary">Relatório Prefeitura</p>
                  <p className="text-sm font-bold text-slate-500 mt-1">
                    Total de alunos, distribuição por rede de ensino, faixas etárias e horas-aula dadas.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : report === "classes-year" ? (
        /* ── Relatório: Aulas Dadas no Ano ── */
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <Button
              variant="ghost"
              className="rounded-2xl w-fit px-4 font-black text-slate-600 hover:bg-slate-100"
              onClick={() => setReport("home")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-500">Ano:</span>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 bg-white focus:outline-none"
              >
                {Array.from(new Set(attendanceSessions.map((s) => s.date.slice(0, 4)))).sort().reverse().map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {(() => {
            const filtered = attendanceSessions.filter(
              (s) => s.finalizedAt && s.date.startsWith(yearFilter)
            );

            // Months present in filtered data
            const months = [...new Set(filtered.map((s) => s.date.slice(0, 7)))].sort();

            // Build rows: per class
            const classIds = [...new Set(filtered.map((s) => s.classId))];
            const rows = classIds.map((classId) => {
              const cls = classes.find((c) => c.id === classId);
              const bySessions = filtered.filter((s) => s.classId === classId);
              const total = bySessions.length;
              const byMonth: Record<string, number> = {};
              for (const s of bySessions) {
                const m = s.date.slice(0, 7);
                byMonth[m] = (byMonth[m] ?? 0) + 1;
              }
              return { classId, name: cls?.name ?? classId, period: cls?.period ?? "", total, byMonth };
            }).sort((a, b) => a.name.localeCompare(b.name));

            const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);

            if (rows.length === 0) return (
              <div className="text-center py-16 text-slate-400">
                Nenhuma aula finalizada encontrada para {yearFilter}.
              </div>
            );

            return (
              <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black text-slate-800">Aulas Realizadas — {yearFilter}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {grandTotal} aulas · {grandTotal * 2}h no total
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-2xl font-bold gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => printClassesYearReport(rows, months, grandTotal, yearFilter)}
                    >
                      <Printer className="h-4 w-4" /> Imprimir
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-2xl font-bold gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => void downloadClassesYearPdf(rows, months, grandTotal, yearFilter)}
                    >
                      <FileDown className="h-4 w-4" /> PDF
                    </Button>
                  </div>
                </div>
                {/* Mobile: cards por turma */}
                <div className="md:hidden divide-y divide-slate-100">
                  {rows.map((row) => (
                    <div key={row.classId} className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate">{row.name}</p>
                          {row.period && <p className="text-xs text-slate-400">{row.period}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-slate-400 font-bold uppercase">Total</p>
                          <p className="font-black text-slate-800">{row.total} <span className="text-xs text-emerald-600">/ {row.total * 2}h</span></p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {months.map((m) => {
                          const v = row.byMonth[m] ?? 0;
                          if (!v) return null;
                          return (
                            <span key={m} className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-100 px-2 py-0.5 text-xs">
                              <span className="text-slate-400 font-bold">{new Date(m + "-15").toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span>
                              <span className="font-bold text-slate-700">{v}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div className="p-4 bg-slate-50 flex items-center justify-between">
                    <span className="font-black text-slate-700">TOTAL</span>
                    <span className="font-black text-emerald-700">{grandTotal} aulas / {grandTotal * 2}h</span>
                  </div>
                </div>

                {/* Desktop: tabela */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left px-6 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Turma</th>
                        {months.map((m) => (
                          <th key={m} className="text-center px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">
                            {new Date(m + "-15").toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                          </th>
                        ))}
                        <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Aulas</th>
                        <th className="text-center px-4 py-3 font-semibold text-emerald-700 text-xs uppercase tracking-wide">Horas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {rows.map((row) => (
                        <tr key={row.classId} className="hover:bg-slate-50/50">
                          <td className="px-6 py-3">
                            <p className="font-semibold text-slate-800">{row.name}</p>
                            {row.period && <p className="text-xs text-slate-400">{row.period}</p>}
                          </td>
                          {months.map((m) => (
                            <td key={m} className="text-center px-4 py-3 text-slate-600">
                              {row.byMonth[m] ?? <span className="text-slate-200">—</span>}
                            </td>
                          ))}
                          <td className="text-center px-4 py-3 font-semibold text-slate-700">{row.total}</td>
                          <td className="text-center px-4 py-3 font-bold text-emerald-600">{row.total * 2}h</td>
                        </tr>
                      ))}
                      {/* Total row */}
                      <tr className="bg-slate-50 border-t-2 border-slate-200">
                        <td className="px-6 py-3 font-bold text-slate-700">TOTAL</td>
                        {months.map((m) => (
                          <td key={m} className="text-center px-4 py-3 font-semibold text-slate-700">
                            {rows.reduce((sum, r) => sum + (r.byMonth[m] ?? 0), 0) || <span className="text-slate-200">—</span>}
                          </td>
                        ))}
                        <td className="text-center px-4 py-3 font-bold text-slate-800">{grandTotal}</td>
                        <td className="text-center px-4 py-3 font-black text-emerald-700">{grandTotal * 2}h</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })()}
        </div>
      ) : report === "prefeitura" ? (
        (() => {
          // ── Cálculos do Relatório Prefeitura ──
          // Filtra apenas alunos matriculados no projeto ativo (via classes carregadas)
          const enrolledInProject = new Set(classes.flatMap((c) => c.studentIds || []));
          const projectStudents = students.filter((s) => enrolledInProject.has(s.id));
          const total = projectStudents.length;

          const sc = { publica: 0, particular: 0, superior: 0, naoEstuda: 0, outros: 0 };
          for (const s of projectStudents) {
            const raw = (s.schoolType || "").toLowerCase().trim();
            if (raw === "municipal" || raw === "state") sc.publica++;
            else if (raw === "private") sc.particular++;
            else if (raw === "higher") sc.superior++;
            else if (raw === "none") sc.naoEstuda++;
            else sc.outros++;
          }
          const schoolTypes = [
            { label: "Rede Pública", count: sc.publica, color: "#008ca0" },
            { label: "Particular", count: sc.particular, color: "#f59e0b" },
            { label: "Ensino Superior", count: sc.superior, color: "#6366f1" },
            { label: "Não estudante", count: sc.naoEstuda, color: "#f43f5e" },
            ...(sc.outros > 0 ? [{ label: "Não informado", count: sc.outros, color: "#cbd5e1" }] : []),
          ].filter((d) => d.count > 0);

          const ageGroups = [
            { label: "Até 9 anos", min: 0, max: 9, count: 0 },
            { label: "10–12 anos", min: 10, max: 12, count: 0 },
            { label: "13–15 anos", min: 13, max: 15, count: 0 },
            { label: "16–18 anos", min: 16, max: 18, count: 0 },
            { label: "19–25 anos", min: 19, max: 25, count: 0 },
            { label: "26+ anos", min: 26, max: 999, count: 0 },
          ];
          for (const s of projectStudents) {
            const age = s.age ?? 0;
            for (const g of ageGroups) {
              if (age >= g.min && age <= g.max) { g.count++; break; }
            }
          }

          const hoursRows = classes
            .map((c) => {
              const dur =
                c.startTime && c.endTime
                  ? Math.max(0, parseTimeHours(c.endTime) - parseTimeHours(c.startTime))
                  : 2;
              const sess = attendanceSessions.filter(
                (s) => s.classId === c.id && s.finalizedAt && s.date.startsWith(prefeituraYear)
              ).length;
              return { name: c.name, period: c.period || "", sessions: sess, hours: +(sess * dur).toFixed(1) };
            })
            .filter((r) => r.sessions > 0)
            .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

          const totalSessions = hoursRows.reduce((s, r) => s + r.sessions, 0);
          const totalHours = +hoursRows.reduce((s, r) => s + r.hours, 0).toFixed(1);

          return (
            <div className="space-y-6">
              {/* Cabeçalho */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <Button
                  variant="ghost"
                  className="rounded-2xl w-fit px-4 font-black text-slate-600 hover:bg-slate-100"
                  onClick={() => setReport("home")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                </Button>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-500">Ano:</span>
                    <select
                      value={prefeituraYear}
                      onChange={(e) => setPrefeituraYear(e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 bg-white focus:outline-none"
                    >
                      {Array.from(new Set(attendanceSessions.map((s) => s.date.slice(0, 4)))).sort().reverse().map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-2xl font-bold gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    onClick={() =>
                      printPrefeituraReport({
                        projectName: getReportProjectName(),
                        total,
                        schoolTypes,
                        ageGroups,
                        hoursRows,
                        totalSessions,
                        totalHours,
                      })
                    }
                  >
                    <Printer className="h-4 w-4" /> Imprimir
                  </Button>
                </div>
              </div>

              {/* Título */}
              <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-3xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200">
                      <Building2 className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Relatório</p>
                      <p className="text-2xl font-black text-primary mt-0.5">Relatório Prefeitura</p>
                      <p className="text-slate-500 font-medium mt-1">Dados consolidados do projeto ativo.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Linha 1: Total de alunos + Rede de ensino */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Total */}
                <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total</p>
                    <p className="text-base font-black text-slate-700 mt-0.5">Alunos no Projeto</p>
                  </div>
                  <CardContent className="p-8 flex flex-col items-center justify-center gap-2">
                    <span className="text-6xl font-black text-primary leading-none">{total}</span>
                    <span className="text-sm font-bold text-slate-400">alunos matriculados</span>
                  </CardContent>
                </Card>

                {/* Rede de ensino */}
                <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden lg:col-span-2">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Distribuição</p>
                    <p className="text-base font-black text-slate-700 mt-0.5">Rede de Ensino</p>
                  </div>
                  <CardContent className="p-6 space-y-4">
                    {schoolTypes.length === 0 ? (
                      <p className="text-slate-400 text-sm font-medium text-center py-4">Nenhum dado disponível.</p>
                    ) : (
                      schoolTypes.map((st) => {
                        const pct = total > 0 ? (st.count / total) * 100 : 0;
                        return (
                          <div key={st.label} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-black text-slate-700">{st.label}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-slate-500">{st.count} aluno{st.count !== 1 ? "s" : ""}</span>
                                <span className="text-sm font-black w-12 text-right" style={{ color: st.color }}>{pct.toFixed(1)}%</span>
                              </div>
                            </div>
                            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%`, backgroundColor: st.color }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Linha 2: Faixas etárias + Horas-aula */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Faixas etárias */}
                <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Perfil</p>
                    <p className="text-base font-black text-slate-700 mt-0.5">Faixas Etárias</p>
                  </div>
                  <CardContent className="p-6 space-y-4">
                    {ageGroups.filter((g) => g.count > 0).length === 0 ? (
                      <p className="text-slate-400 text-sm font-medium text-center py-4">Nenhum dado disponível.</p>
                    ) : (
                      ageGroups.filter((g) => g.count > 0).map((g) => {
                        const pct = total > 0 ? (g.count / total) * 100 : 0;
                        return (
                          <div key={g.label} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-black text-slate-700">{g.label}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-slate-500">{g.count}</span>
                                <span className="text-sm font-black text-indigo-600 w-12 text-right">{pct.toFixed(1)}%</span>
                              </div>
                            </div>
                            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>

                {/* Aulas dadas */}
                <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Frequência</p>
                    <p className="text-base font-black text-slate-700 mt-0.5">Aulas e Horas Dadas</p>
                  </div>
                  <CardContent className="p-8 grid grid-cols-2 gap-6">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span className="text-5xl font-black text-emerald-600 leading-none">{totalSessions}</span>
                      <span className="text-sm font-bold text-slate-400 mt-1">aulas dadas</span>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-1 border-l border-slate-100">
                      <span className="text-5xl font-black text-primary leading-none">{totalHours}</span>
                      <span className="text-sm font-bold text-slate-400 mt-1">horas de aula</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          );
        })()
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="ghost"
              className="rounded-2xl w-fit px-4 font-black text-slate-600 hover:bg-slate-100"
              onClick={() => setReport("home")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>

            <div className="flex items-center gap-2">
              <Badge className="rounded-full bg-slate-900/5 text-slate-700 border-none font-black">Legenda:</Badge>
              <span className="text-xs font-black text-emerald-700">P</span>
              <span className="text-xs font-black text-amber-700">A</span>
              <span className="text-xs font-black text-rose-700">F</span>
              <span className="text-xs font-black text-sky-700">J</span>
              <span className="text-xs font-bold text-slate-400">(em branco = não estava na turma)</span>
            </div>
          </div>

          <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Relatório</p>
                  <p className="text-2xl font-black text-primary mt-1">Chamada</p>
                  <p className="text-slate-500 font-medium mt-1">
                    Primeiro você pode ver o resumo de todas as turmas. Se quiser, escolha uma turma específica.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Turma</p>
                    <Select value={classId} onValueChange={setClassId}>
                      <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>Todas as turmas</SelectItem>
                        {classes.map((c) => {
                          const parent = c.parentClassId
                            ? classes.find((p) => p.id === c.parentClassId)
                            : null;
                          const label = parent ? `${parent.name} › ${c.name}` : c.name;
                          return (
                            <SelectItem key={c.id} value={c.id}>
                              {label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mês</p>
                    <Select value={selectedMonthPart} onValueChange={(m) => setMonth(`${selectedYear}-${m}`)}>
                      <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white">
                        <SelectValue placeholder="Mês" />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ano</p>
                    <Select value={selectedYear} onValueChange={(y) => setMonth(`${y}-${selectedMonthPart}`)}>
                      <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white">
                        <SelectValue placeholder="Ano" />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((y) => (
                          <SelectItem key={y} value={y}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3 items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500">
                  <CalendarDays className="h-4 w-4" />
                  <span className="text-sm font-bold">{monthLabel(month)}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge className="rounded-full bg-primary/10 text-primary border border-primary/15 font-black">
                    <Users className="h-4 w-4 mr-2" />
                    {classId === ALL
                      ? `Alunos (geral nas turmas): ${totalStudentsInClasses}`
                      : `Alunos na turma: ${selectedClass?.studentIds?.length || 0}`}
                  </Badge>

                  <Button
                    variant="outline"
                    className="rounded-2xl gap-2 h-11 font-black border-slate-200"
                    onClick={() => {
                      if (!matrix || !matrix.dates.length) return;
                      printAttendanceReport(matrix);
                    }}
                    disabled={!matrix || matrix.dates.length === 0}
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir
                  </Button>

                  <Button
                    variant="outline"
                    className="rounded-2xl gap-2 h-11 font-black border-slate-200"
                    onClick={async () => {
                      if (!matrix || !matrix.dates.length) return;
                      try {
                        await downloadAttendanceXls(matrix);
                      } catch {
                        showError("Não foi possível gerar o XLS.");
                      }
                    }}
                    disabled={!matrix || matrix.dates.length === 0}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Gerar XLS
                  </Button>

                  <Button
                    className="rounded-2xl gap-2 h-11 font-black shadow-lg shadow-primary/20"
                    onClick={async () => {
                      if (!matrix) return;
                      try {
                        await generateAttendancePdf(matrix);
                      } catch {
                        showError("Não foi possível gerar o PDF.");
                      }
                    }}
                    disabled={!matrix || matrix.dates.length === 0}
                  >
                    <FileDown className="h-4 w-4" />
                    Gerar PDF
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-0">
              {classId === ALL ? (
                <div className="p-6 md:p-8">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card className="border border-slate-100 rounded-[2rem] shadow-sm">
                      <div className="p-5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resumo</p>
                        <p className="text-xl font-black text-primary mt-1">Todas as turmas</p>
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-600">Turmas cadastradas</span>
                            <span className="text-sm font-black text-slate-900">{classes.length}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-600">Alunos (únicos) nas turmas</span>
                            <span className="text-sm font-black text-slate-900">{totalStudentsInClasses}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-600">Mês</span>
                            <span className="text-sm font-black text-slate-900">{monthLabel(month)}</span>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="border border-slate-100 rounded-[2rem] shadow-sm md:col-span-2 lg:col-span-2">
                      <div className="p-5 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ação</p>
                          <p className="text-xl font-black text-primary mt-1">Escolha uma turma</p>
                          <p className="text-sm font-bold text-slate-500 mt-1">Clique em qualquer turma abaixo para ver o relatório detalhado.</p>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-secondary/10 text-primary flex items-center justify-center border border-secondary/20">
                          <Layers className="h-6 w-6" />
                        </div>
                      </div>
                    </Card>
                  </div>

                  <div className="mt-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Turmas</p>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {classesWithCounts.map(({ cls, studentsCount, callDaysCount }) => (
                        <button
                          key={cls.id}
                          onClick={() => setClassId(cls.id)}
                          className="text-left rounded-[2rem] border border-slate-100 bg-white p-5 hover:border-primary/25 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-base font-black text-primary truncate">{cls.name}</p>
                              <p className="text-xs font-bold text-slate-500 mt-1">
                                {cls.period} • {cls.startTime}–{cls.endTime}
                              </p>
                            </div>
                            <Badge
                              className={cn(
                                "rounded-full border-none font-black",
                                cls.status === "Ativo" ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700",
                              )}
                            >
                              {cls.status}
                            </Badge>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <Badge className="rounded-full bg-primary/10 text-primary border border-primary/15 font-black">
                              <Users className="h-3.5 w-3.5 mr-1" /> {studentsCount} aluno(s)
                            </Badge>
                            <Badge className="rounded-full bg-slate-900/5 text-slate-700 border-none font-black">
                              <ClipboardCheck className="h-3.5 w-3.5 mr-1" /> {callDaysCount} dia(s) com chamada
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : !matrix ? (
                <div className="p-10 text-center bg-white">
                  <BarChart3 className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-500">Selecione turma e mês.</p>
                </div>
              ) : matrix.dates.length === 0 ? (
                <div className="p-10 text-center bg-white">
                  <ClipboardCheck className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-500">Nenhuma chamada registrada neste mês.</p>
                  <p className="text-xs text-slate-400 mt-1">Crie chamadas na aba "Chamada" da turma.</p>
                </div>
              ) : (
                <div className="p-6 md:p-8 space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card className="border border-slate-100 rounded-[2rem] shadow-sm">
                      <div className="p-5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resumo</p>
                        <p className="text-xl font-black text-primary mt-1">{matrix.className}</p>
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-600">Alunos no mês</span>
                            <span className="text-sm font-black text-slate-900">{matrix.students.length}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-600">Dias com chamada</span>
                            <span className="text-sm font-black text-slate-900">{matrix.dates.length}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-600">Mês</span>
                            <span className="text-sm font-black text-slate-900">{monthLabel(month)}</span>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="border border-slate-100 rounded-[2rem] shadow-sm md:col-span-2">
                      <div className="p-5 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Legenda</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {statusPill("presente")} <span className="text-xs font-bold self-center">Presente</span>
                            {statusPill("atrasado")} <span className="text-xs font-bold self-center">Atrasado</span>
                            {statusPill("falta")} <span className="text-xs font-bold self-center">Falta</span>
                            {statusPill("justificada")} <span className="text-xs font-bold self-center">Justificada</span>
                            <span className="text-xs font-bold text-slate-400 self-center">— = não estava na turma</span>
                          </div>
                        </div>
                        <NotebookPen className="h-6 w-6 text-slate-300 shrink-0" />
                      </div>
                    </Card>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Pré-visualização</p>

                    {/* Mobile: cards por aluno */}
                    <div className="md:hidden space-y-2">
                      {matrix.students.map((st) => (
                        <div key={st.id} className="rounded-2xl border border-slate-100 p-3 bg-white">
                          <p className="font-bold text-slate-800 text-sm">{st.socialName || st.preferredName || st.fullName}</p>
                          {(st.socialName || st.preferredName) && (
                            <p className="text-[10px] text-slate-400 font-bold">{st.fullName}</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {matrix.dates.map((d) => {
                              const isMember = matrix.membershipByStudentByDate[st.id]?.[d];
                              if (!isMember) return null;
                              return (
                                <div key={d} className="flex flex-col items-center">
                                  <span className="text-[9px] text-slate-400 font-bold">{formatDateCol(d)}</span>
                                  {statusPill(matrix.statusByStudentByDate[st.id]?.[d])}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-100">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="text-left px-4 py-3 font-black text-slate-500 uppercase tracking-wider whitespace-nowrap sticky left-0 bg-slate-50">Aluno</th>
                            {matrix.dates.map((d) => (
                              <th key={d} className="text-center px-3 py-3 font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                {formatDateCol(d)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {matrix.students.map((st) => (
                            <tr key={st.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-4 py-3 sticky left-0 bg-white hover:bg-slate-50/60">
                                <p className="font-bold text-slate-800 whitespace-nowrap">{st.socialName || st.preferredName || st.fullName}</p>
                                {(st.socialName || st.preferredName) && (
                                  <p className="text-[10px] text-slate-400 font-bold whitespace-nowrap">{st.fullName}</p>
                                )}
                              </td>
                              {matrix.dates.map((d) => {
                                const isMember = matrix.membershipByStudentByDate[st.id]?.[d];
                                if (!isMember) return <td key={d} className="text-center px-3 py-3 text-slate-300 font-bold">—</td>;
                                return (
                                  <td key={d} className="text-center px-3 py-2">
                                    {statusPill(matrix.statusByStudentByDate[st.id]?.[d])}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}