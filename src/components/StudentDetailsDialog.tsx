"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Camera,
  FileText,
  GraduationCap,
  HeartPulse,
  MapPin,
  School,
  ShieldAlert,
  User,
  Layers,
  Info,
  ExternalLink,
  Clock,
  Edit2,
  KeyRound,
  BarChart2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { fetchModeBStudentMonthSchedule } from "@/services/modeBService";
import type { ModeBStudentMonthRow } from "@/integrations/supabase/mode-b";
import { getActiveProjectId } from "@/utils/projects";
import { StudentRegistration } from "@/types/student";
import { SchoolClass } from "@/types/class";
import { readScoped } from "@/utils/storage";
import { Button } from "@/components/ui/button";
import { getAreaBaseFromPathname } from "@/utils/route-base";
import { resetStudentPassword } from "@/utils/student-auth";
import { showSuccess, showError } from "@/utils/toast";

interface StudentDetailsDialogProps {
  student: StudentRegistration | null;
  isOpen: boolean;
  onClose: () => void;
}

function formatBirthDate(iso?: string) {
  if (!iso) return "---";
  // expects yyyy-mm-dd
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function labelSchoolType(type?: string) {
  switch (type) {
    case "municipal":
      return "Rede Municipal";
    case "state":
      return "Rede Estadual";
    case "private":
      return "Rede Particular";
    case "higher":
      return "Ensino Superior";
    case "none":
      return "Não estuda";
    default:
      return type || "---";
  }
}

function buildAddressLine(student: StudentRegistration) {
  const parts = [
    student.street,
    student.number,
    student.neighborhood,
    student.city,
    student.uf,
    student.cep,
  ]
    .map((p) => (p || "").toString().trim())
    .filter(Boolean);

  return parts.join(", ");
}

const Row = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-4">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
      {label}
    </p>
    <div className="mt-1 text-sm font-bold text-slate-700 break-words">{value ?? "---"}</div>
  </div>
);

const StudentDetailsDialog = ({ student, isOpen, onClose }: StudentDetailsDialogProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [classesForStudent, setClassesForStudent] = useState<SchoolClass[]>([]);

  useEffect(() => {
    if (!student || !isOpen) {
      setClassesForStudent([]);
      return;
    }
    // Tenta via enrollments remotos primeiro; cai para localStorage
    const run = async () => {
      try {
        const projectId = getActiveProjectId();
        if (projectId) {
          const { fetchProjectEnrollmentsRemoteWithMeta } = await import("@/services/classesService");
          const enrRes = await fetchProjectEnrollmentsRemoteWithMeta(projectId);
          const classIds = new Set(
            enrRes.enrollments
              .filter((e) => String(e.student_id) === String(student.id))
              .map((e) => e.class_id)
          );
          if (classIds.size > 0) {
            const allClasses = readScoped<SchoolClass[]>("classes", []);
            setClassesForStudent(allClasses.filter((c) => classIds.has(c.id)));
            return;
          }
        }
      } catch {
        // fallback abaixo
      }
      // Fallback: campo legado studentIds no localStorage
      const raw = readScoped<SchoolClass[]>("classes", []);
      setClassesForStudent(raw.filter((c) => (c.studentIds || []).includes(student.id)));
    };
    void run();
  }, [student?.id, isOpen]);

  const maps = useMemo(() => {
    if (!student) return null;
    const addressLine = buildAddressLine(student);
    if (!addressLine) return null;

    const q = encodeURIComponent(addressLine);
    return {
      addressLine,
      embedUrl: `https://www.google.com/maps?q=${q}&output=embed`,
      openUrl: `https://www.google.com/maps/search/?api=1&query=${q}`,
    };
  }, [student, isOpen]);

  // ── Frequência tab state ─────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("pessoais");
  const [freqMonth, setFreqMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [freqRows, setFreqRows] = useState<ModeBStudentMonthRow[]>([]);
  const [freqYearRows, setFreqYearRows] = useState<ModeBStudentMonthRow[]>([]);
  const [freqLoading, setFreqLoading] = useState(false);

  // Reset when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab("pessoais");
      setFreqRows([]);
      setFreqYearRows([]);
    }
  }, [isOpen]);

  // Load month data (eager — não depende da aba ativa)
  useEffect(() => {
    if (!student || !isOpen) return;
    const projectId = getActiveProjectId();
    if (!projectId) return;
    let cancelled = false;
    setFreqLoading(true);
    fetchModeBStudentMonthSchedule({ projectId, studentId: student.id, month: freqMonth })
      .then((data) => { if (!cancelled) setFreqRows(data || []); })
      .catch(() => { if (!cancelled) setFreqRows([]); })
      .finally(() => { if (!cancelled) setFreqLoading(false); });
    return () => { cancelled = true; };
  }, [student?.id, freqMonth, isOpen]);

  // Load year data (eager — não depende da aba ativa)
  useEffect(() => {
    if (!student || !isOpen) return;
    const projectId = getActiveProjectId();
    if (!projectId) return;
    let cancelled = false;
    const year = new Date().getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
    void Promise.all(months.map((m) => fetchModeBStudentMonthSchedule({ projectId, studentId: student.id, month: m })))
      .then((results) => { if (!cancelled) setFreqYearRows(results.flat()); })
      .catch(() => { if (!cancelled) setFreqYearRows([]); });
    return () => { cancelled = true; };
  }, [student?.id, isOpen]);

  const freqCalendarModifiers = useMemo(() => {
    const presente: Date[] = [], falta: Date[] = [], atrasado: Date[] = [];
    const justificada: Date[] = [], agendada: Date[] = [];
    for (const r of freqRows) {
      const d = new Date(`${r.ymd}T00:00:00`);
      if (r.finalized_at && r.status) {
        if (r.status === "presente") presente.push(d);
        else if (r.status === "falta") falta.push(d);
        else if (r.status === "atrasado") atrasado.push(d);
        else if (r.status === "justificada") justificada.push(d);
      } else { agendada.push(d); }
    }
    return { "cal-presente": presente, "cal-falta": falta, "cal-atrasado": atrasado, "cal-justificada": justificada, "cal-agendada": agendada };
  }, [freqRows]);

  const freqMonthTotals = useMemo(() => {
    const fin = freqRows.filter((r) => r.finalized_at);
    return {
      presente: fin.filter((r) => r.status === "presente").length,
      falta: fin.filter((r) => r.status === "falta").length,
      atrasado: fin.filter((r) => r.status === "atrasado").length,
      justificada: fin.filter((r) => r.status === "justificada").length,
      total: fin.length,
    };
  }, [freqRows]);

  const freqAnnualTotals = useMemo(() => {
    const fin = freqYearRows.filter((r) => r.finalized_at);
    return {
      presente: fin.filter((r) => r.status === "presente").length,
      falta: fin.filter((r) => r.status === "falta").length,
      atrasado: fin.filter((r) => r.status === "atrasado").length,
      justificada: fin.filter((r) => r.status === "justificada").length,
      total: fin.length,
    };
  }, [freqYearRows]);

  const freqYearChartData = useMemo(() => {
    const year = new Date().getFullYear();
    const labels = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    return Array.from({ length: 12 }, (_, i) => {
      const mk = `${year}-${String(i + 1).padStart(2, "0")}`;
      const mRows = freqYearRows.filter((r) => r.ymd.startsWith(mk) && r.finalized_at);
      return {
        mes: labels[i],
        Presente: mRows.filter((r) => r.status === "presente").length,
        Atraso: mRows.filter((r) => r.status === "atrasado").length,
        Justificada: mRows.filter((r) => r.status === "justificada").length,
        Falta: mRows.filter((r) => r.status === "falta").length,
      };
    });
  }, [freqYearRows]);

  const freqMonthDate = useMemo(() => new Date(`${freqMonth}-01T00:00:00`), [freqMonth]);
  const freqMonthLabel = useMemo(
    () => new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(freqMonthDate),
    [freqMonthDate],
  );
  const navFreqMonth = (dir: 1 | -1) => {
    const d = new Date(`${freqMonth}-01T00:00:00`);
    d.setMonth(d.getMonth() + dir);
    setFreqMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  // ─────────────────────────────────────────────────────────────────────────

  const [photoOpen, setPhotoOpen] = useState(false);

  if (!student) return null;

  const onEdit = () => {
    onClose();
    const base = getAreaBaseFromPathname(location.pathname);
    navigate(`${base}/alunos/editar/${student.id}`, {
      state: { returnTo: location.pathname, student },
    });
  };

  const onResetPassword = async () => {
    if (!window.confirm(`Resetar a senha de ${student.fullName} para "EcoBuzios123"?`)) return;
    const ok = await resetStudentPassword(student.id);
    if (ok) showSuccess("Senha resetada para EcoBuzios123.");
    else showError("Não foi possível resetar a senha.");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={
          "p-0 overflow-hidden border-none shadow-2xl flex flex-col min-h-0 " +
          "rounded-[2.25rem] sm:rounded-[2.75rem] " +
          "w-[calc(100vw-1.5rem)] sm:w-[calc(100vw-2rem)] md:max-w-5xl " +
          // 100dvh evita corte em mobile (barra do navegador)
          "h-[calc(100dvh-1.5rem)] sm:h-[calc(100dvh-2rem)]"
        }
      >
        <DialogHeader className="p-6 sm:p-8 bg-primary text-white shrink-0">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5 sm:gap-6">
              <button
                className="h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-[1.75rem] sm:rounded-[2rem] border-4 border-white/30 bg-white/20 shadow-xl flex items-center justify-center shrink-0 cursor-zoom-in"
                onClick={() => student.photo && setPhotoOpen(true)}
                title="Ampliar foto"
                type="button"
              >
                {student.photo ? (
                  <img
                    src={student.photo}
                    alt={student.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-10 w-10 text-white/50" />
                )}
              </button>

              {/* Lightbox */}
              {photoOpen && student.photo && (
                <div
                  className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                  onClick={() => setPhotoOpen(false)}
                >
                  <img
                    src={student.photo}
                    alt={student.fullName}
                    className="max-h-[90dvh] max-w-[90dvw] rounded-[2rem] shadow-2xl object-contain"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
              <div className="space-y-2 min-w-0">
                <DialogTitle className="text-2xl font-black tracking-tight truncate">
                  {student.fullName}
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-secondary text-primary border-none font-black">
                    Matrícula: {student.registration}
                  </Badge>
                  <Badge className="bg-white/20 text-white border-none">
                    {student.age} anos
                  </Badge>
                  <Badge className="bg-white/20 text-white border-none">
                    {student.status}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 border border-white/15">
                <Layers className="h-4 w-4 text-white/80" />
                <span className="text-sm font-bold text-white/90">
                  Turmas: {classesForStudent.length}
                </span>
              </div>

              <Button
                type="button"
                onClick={onResetPassword}
                variant="outline"
                className="rounded-2xl bg-white/10 border-white/30 text-white hover:bg-white/20 font-black gap-2"
              >
                <KeyRound className="h-4 w-4" />
                Resetar senha
              </Button>
              <Button
                type="button"
                onClick={onEdit}
                className="rounded-2xl bg-white text-primary hover:bg-white/90 font-black gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Editar aluno
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto overscroll-contain">
          <div className="p-5 pb-10 sm:p-6 sm:pb-12 md:p-8">

            {/* ── Gráficos de frequência (topo) ──────────────────────────── */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Mensal */}
              {(() => {
                const donutData = [
                  { name: "Presente", value: freqMonthTotals.presente, color: "#10b981" },
                  { name: "Falta", value: freqMonthTotals.falta, color: "#f43f5e" },
                  { name: "Atraso", value: freqMonthTotals.atrasado, color: "#f59e0b" },
                  { name: "Justificada", value: freqMonthTotals.justificada, color: "#8b5cf6" },
                ].filter((d) => d.value > 0);
                return (
                  <div className="rounded-[2rem] border border-slate-100 bg-white p-5">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mensal</p>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => navFreqMonth(-1)} className="h-6 w-6 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center hover:bg-slate-100">
                          <ChevronLeft className="h-3 w-3 text-slate-600" />
                        </button>
                        <p className="text-[10px] font-black text-primary capitalize px-1">{freqMonthLabel}</p>
                        <button type="button" onClick={() => navFreqMonth(1)} className="h-6 w-6 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center hover:bg-slate-100">
                          <ChevronRight className="h-3 w-3 text-slate-600" />
                        </button>
                      </div>
                    </div>
                    {freqLoading ? (
                      <div className="flex items-center justify-center h-[140px] text-sm font-bold text-slate-400">Carregando…</div>
                    ) : donutData.length === 0 ? (
                      <div className="flex items-center justify-center h-[140px] text-sm font-bold text-slate-400">Sem dados</div>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height={140}>
                          <PieChart>
                            <Pie data={donutData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} dataKey="value" strokeWidth={2}>
                              {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                            <Tooltip formatter={(v: any, n: any) => [`${v} aula(s)`, n]} contentStyle={{ borderRadius: "0.75rem", border: "1px solid #e2e8f0", fontSize: 12, fontWeight: 700 }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
                          {donutData.map((d) => (
                            <span key={d.name} className="inline-flex items-center gap-1 text-[10px] font-black text-slate-600">
                              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                              {d.name} ({d.value})
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Anual */}
              {(() => {
                const donutData = [
                  { name: "Presente", value: freqAnnualTotals.presente, color: "#10b981" },
                  { name: "Falta", value: freqAnnualTotals.falta, color: "#f43f5e" },
                  { name: "Atraso", value: freqAnnualTotals.atrasado, color: "#f59e0b" },
                  { name: "Justificada", value: freqAnnualTotals.justificada, color: "#8b5cf6" },
                ].filter((d) => d.value > 0);
                return (
                  <div className="rounded-[2rem] border border-slate-100 bg-white p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      Anual — {new Date().getFullYear()}
                    </p>
                    {freqAnnualTotals.total === 0 ? (
                      <div className="flex items-center justify-center h-[140px] text-sm font-bold text-slate-400">Carregando…</div>
                    ) : donutData.length === 0 ? (
                      <div className="flex items-center justify-center h-[140px] text-sm font-bold text-slate-400">Sem dados</div>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height={140}>
                          <PieChart>
                            <Pie data={donutData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} dataKey="value" strokeWidth={2}>
                              {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                            <Tooltip formatter={(v: any, n: any) => [`${v} aula(s)`, n]} contentStyle={{ borderRadius: "0.75rem", border: "1px solid #e2e8f0", fontSize: 12, fontWeight: 700 }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
                          {donutData.map((d) => (
                            <span key={d.name} className="inline-flex items-center gap-1 text-[10px] font-black text-slate-600">
                              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                              {d.name} ({d.value})
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
            {/* ──────────────────────────────────────────────────────────── */}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-2 sm:grid-cols-3 md:flex md:justify-start gap-2 h-auto rounded-[1.5rem] bg-slate-50 p-2 border border-slate-100">
                <TabsTrigger value="pessoais" className="rounded-xl font-black">
                  <User className="h-4 w-4 mr-2" />
                  Dados pessoais
                </TabsTrigger>
                <TabsTrigger value="endereco" className="rounded-xl font-black">
                  <MapPin className="h-4 w-4 mr-2" />
                  Endereço
                </TabsTrigger>
                <TabsTrigger value="escola" className="rounded-xl font-black">
                  <School className="h-4 w-4 mr-2" />
                  Escola
                </TabsTrigger>
                <TabsTrigger value="saude" className="rounded-xl font-black">
                  <HeartPulse className="h-4 w-4 mr-2" />
                  Saúde
                </TabsTrigger>
                <TabsTrigger value="turmas" className="rounded-xl font-black">
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Turmas
                </TabsTrigger>
                <TabsTrigger value="imagem" className="rounded-xl font-black">
                  <Camera className="h-4 w-4 mr-2" />
                  Uso de imagem
                </TabsTrigger>
                <TabsTrigger value="docs" className="rounded-xl font-black">
                  <FileText className="h-4 w-4 mr-2" />
                  Documentação
                </TabsTrigger>
                <TabsTrigger value="sistema" className="rounded-xl font-black">
                  <Info className="h-4 w-4 mr-2" />
                  Sistema
                </TabsTrigger>
                <TabsTrigger value="frequencia" className="rounded-xl font-black">
                  <BarChart2 className="h-4 w-4 mr-2" />
                  Frequência
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pessoais" className="mt-6 space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Row label="Nome social" value={student.socialName || "---"} />
                  <Row label="Nome preferido" value={student.preferredName || "---"} />
                  <Row label="CPF" value={student.cpf || "---"} />
                  <Row label="Data de nascimento" value={formatBirthDate(student.birthDate)} />
                  <Row label="Gênero" value={student.gender || "---"} />
                  <Row label="Cor/Raça" value={student.race || "---"} />
                  <Row label="E-mail" value={student.email || "---"} />
                  <Row label="Celular / WhatsApp" value={student.cellPhone || "---"} />
                </div>

                {(student.guardianName || student.guardianKinship || student.guardianPhone) && (
                  <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-5">
                    <div className="flex items-center gap-2 text-primary">
                      <ShieldAlert className="h-4 w-4" />
                      <p className="text-xs font-black uppercase tracking-widest">Responsável</p>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <Row label="Nome" value={student.guardianName || "---"} />
                      <Row label="Parentesco" value={student.guardianKinship || "---"} />
                      <Row label="Telefone" value={student.guardianPhone || "---"} />
                      {student.guardianDeclarationConfirmed !== undefined && (
                        <Row
                          label="Declaração do responsável"
                          value={student.guardianDeclarationConfirmed ? "Confirmada" : "Não confirmada"}
                        />
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="endereco" className="mt-6 space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Row label="CEP" value={student.cep} />
                  <Row label="Bairro" value={student.neighborhood} />
                  <Row label="Logradouro" value={student.street} />
                  <Row label="Número" value={student.number} />
                  <Row label="Complemento" value={student.complement || "---"} />
                  <Row label="Cidade / UF" value={`${student.city} - ${student.uf}`} />
                </div>

                <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-primary">
                        <MapPin className="h-4 w-4" />
                        <p className="text-xs font-black uppercase tracking-widest">
                          Localização (Google Maps)
                        </p>
                      </div>
                      <p className="mt-2 text-sm font-bold text-slate-700 truncate">
                        {maps?.addressLine || "Endereço insuficiente para gerar o mapa."}
                      </p>
                    </div>

                    {maps?.openUrl && (
                      <a
                        href={maps.openUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-black text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
                        title="Abrir no Google Maps"
                      >
                        Abrir
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>

                  {maps?.embedUrl ? (
                    <div className="mt-4 overflow-hidden rounded-[1.75rem] border border-slate-100">
                      <iframe
                        title="Google Maps"
                        src={maps.embedUrl}
                        className="w-full"
                        style={{ height: "clamp(220px, 32vh, 360px)" }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  ) : null}
                </div>
              </TabsContent>

              <TabsContent value="escola" className="mt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Row label="Rede" value={labelSchoolType(student.schoolType)} />
                  <Row label="Instituição" value={student.schoolName || "---"} />
                  {student.schoolOther && (
                    <div className="md:col-span-2">
                      <Row label="Outra instituição (informada)" value={student.schoolOther} />
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="saude" className="mt-6 space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Row label="Tipo sanguíneo" value={student.bloodType || "---"} />
                  <Row
                    label="Alergia"
                    value={student.hasAllergy ? student.allergyDetail || "Sim" : "Não"}
                  />
                  <Row
                    label="Necessidades especiais"
                    value={
                      student.hasSpecialNeeds
                        ? student.specialNeedsDetail || "Sim"
                        : "Não"
                    }
                  />
                  <Row
                    label="Medicamento contínuo"
                    value={student.usesMedication ? student.medicationDetail || "Sim" : "Não"}
                  />
                  <Row
                    label="Restrição física"
                    value={
                      student.hasPhysicalRestriction
                        ? student.physicalRestrictionDetail || "Sim"
                        : "Não"
                    }
                  />
                  <Row
                    label="Praticou atividade"
                    value={student.practicedActivity ? student.practicedActivityDetail || "Sim" : "Não"}
                  />
                  <Row
                    label="Histórico cardíaco na família"
                    value={student.familyHeartHistory ? "Sim" : "Não"}
                  />
                  <div className="md:col-span-2">
                    <Row
                      label="Problemas de saúde"
                      value={
                        student.healthProblems && student.healthProblems.length > 0
                          ? student.healthProblems.join(", ")
                          : "Nenhum"
                      }
                    />
                  </div>
                  {student.observations && (
                    <div className="md:col-span-2">
                      <Row label="Observações" value={student.observations} />
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="turmas" className="mt-6 space-y-4">
                {classesForStudent.length === 0 ? (
                  <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                    <GraduationCap className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-500">
                      Este aluno ainda não está matriculado em nenhuma turma.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {classesForStudent.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-lg font-black text-primary leading-tight">
                              {c.name}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Badge className="bg-secondary text-primary border-none font-black">
                                {c.period}
                              </Badge>
                              <Badge variant="outline" className="rounded-full">
                                <Clock className="h-3.5 w-3.5 mr-1" />
                                {c.startTime}–{c.endTime}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Vagas
                            </p>
                            <p className="text-sm font-bold text-slate-700">
                              {c.capacity === 0 ? "Ilimitado" : c.capacity}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="imagem" className="mt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Row
                    label="Autorização"
                    value={
                      student.imageAuthorization === "authorized"
                        ? "Autorizado"
                        : "Não autorizado"
                    }
                  />
                </div>
              </TabsContent>

              <TabsContent value="docs" className="mt-6">
                <div className="rounded-[2rem] border border-slate-100 bg-white p-6">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Documentos entregues
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {student.docsDelivered && student.docsDelivered.length > 0 ? (
                      student.docsDelivered.map((doc) => (
                        <Badge
                          key={doc}
                          variant="outline"
                          className="rounded-full border-primary/20 text-primary font-bold"
                        >
                          {doc}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm font-bold text-slate-500">Nenhum documento marcado.</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sistema" className="mt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Row label="Matrícula (ID)" value={student.registration} />
                  <Row label="Status" value={student.status} />
                  <Row
                    label="Data de cadastro"
                    value={new Date(student.registrationDate).toLocaleString("pt-BR")}
                  />
                  <Row label="ID interno" value={student.id} />
                </div>
              </TabsContent>

              <TabsContent value="frequencia" className="mt-6 space-y-6">
                {/* Navegação de mês */}
                <div className="flex items-center justify-between gap-3 rounded-[2rem] border border-slate-100 bg-slate-50 px-5 py-3">
                  <button
                    type="button"
                    onClick={() => navFreqMonth(-1)}
                    className="h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50"
                  >
                    <ChevronLeft className="h-4 w-4 text-slate-600" />
                  </button>
                  <p className="font-black text-primary capitalize">{freqMonthLabel}</p>
                  <button
                    type="button"
                    onClick={() => navFreqMonth(1)}
                    className="h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50"
                  >
                    <ChevronRight className="h-4 w-4 text-slate-600" />
                  </button>
                </div>

                {/* Calendário */}
                <div className="rounded-[2rem] border border-slate-100 bg-white p-4">
                  {freqLoading ? (
                    <p className="py-10 text-center text-sm font-bold text-slate-400">Carregando...</p>
                  ) : (
                    <>
                      <Calendar
                        mode="single"
                        month={freqMonthDate}
                        onMonthChange={(d) => setFreqMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)}
                        selected={undefined}
                        onSelect={() => {}}
                        modifiers={freqCalendarModifiers}
                        modifiersClassNames={{
                          "cal-presente": "!bg-emerald-500 !text-white !rounded-full font-black",
                          "cal-falta": "!bg-rose-500 !text-white !rounded-full font-black",
                          "cal-atrasado": "!bg-amber-400 !text-white !rounded-full font-black",
                          "cal-justificada": "!bg-violet-500 !text-white !rounded-full font-black",
                          "cal-agendada": "!bg-sky-400 !text-white !rounded-full font-black",
                        }}
                        className="rounded-2xl"
                      />
                      {/* Legenda */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[
                          { color: "bg-sky-400", label: "Agendada" },
                          { color: "bg-emerald-500", label: "Presente" },
                          { color: "bg-amber-400", label: "Atraso" },
                          { color: "bg-rose-500", label: "Falta" },
                          { color: "bg-violet-500", label: "Justificada" },
                        ].map((item) => (
                          <span key={item.label} className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                            <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                            {item.label}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Totais do mês */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Totais do mês</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Presenças", value: freqMonthTotals.presente, cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
                      { label: "Faltas", value: freqMonthTotals.falta, cls: "bg-rose-500/10 text-rose-700 border-rose-500/20" },
                      { label: "Atrasos", value: freqMonthTotals.atrasado, cls: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
                      { label: "Justificativas", value: freqMonthTotals.justificada, cls: "bg-violet-500/10 text-violet-700 border-violet-500/20" },
                    ].map((item) => (
                      <div key={item.label} className={`rounded-2xl border p-4 ${item.cls}`}>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1">{item.label}</p>
                        <p className="text-3xl font-black tracking-tight">{item.value}</p>
                        {freqMonthTotals.total > 0 && (
                          <p className="text-xs font-bold opacity-70 mt-1">
                            {Math.round((item.value / freqMonthTotals.total) * 100)}%
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totais anuais */}
                {freqAnnualTotals.total > 0 && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                      Totais anuais — {new Date().getFullYear()}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Presenças", value: freqAnnualTotals.presente, cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
                        { label: "Faltas", value: freqAnnualTotals.falta, cls: "bg-rose-50 text-rose-700 border-rose-100" },
                        { label: "Atrasos", value: freqAnnualTotals.atrasado, cls: "bg-amber-50 text-amber-700 border-amber-100" },
                        { label: "Justificativas", value: freqAnnualTotals.justificada, cls: "bg-violet-50 text-violet-700 border-violet-100" },
                      ].map((item) => (
                        <div key={item.label} className={`rounded-2xl border p-4 ${item.cls}`}>
                          <p className="text-[10px] font-black uppercase tracking-widest mb-1">{item.label}</p>
                          <p className="text-3xl font-black tracking-tight">{item.value}</p>
                          {freqAnnualTotals.total > 0 && (
                            <p className="text-xs font-bold opacity-70 mt-1">
                              {Math.round((item.value / freqAnnualTotals.total) * 100)}%
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gráfico anual */}
                {freqYearRows.length > 0 && (
                  <div className="rounded-[2rem] border border-slate-100 bg-white p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                      Gráfico anual — {new Date().getFullYear()}
                    </p>
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={freqYearChartData} margin={{ left: 0, right: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                          <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 800 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 800 }} />
                          <Tooltip
                            contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }}
                            formatter={(v: any, n: any, p: any) => {
                              const row = p?.payload || {};
                              const total = (row.Presente || 0) + (row.Atraso || 0) + (row.Justificada || 0) + (row.Falta || 0);
                              const pct = total > 0 ? Math.round((Number(v) / total) * 1000) / 10 : 0;
                              return [`${v} (${pct}%)`, n];
                            }}
                          />
                          <Bar dataKey="Presente" fill="#10b981" radius={[6, 6, 0, 0]} stackId="a" />
                          <Bar dataKey="Atraso" fill="#f59e0b" radius={[0, 0, 0, 0]} stackId="a" />
                          <Bar dataKey="Justificada" fill="#8b5cf6" radius={[0, 0, 0, 0]} stackId="a" />
                          <Bar dataKey="Falta" fill="#ef4444" radius={[6, 6, 0, 0]} stackId="a" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudentDetailsDialog;