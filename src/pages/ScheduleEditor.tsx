// src/pages/ScheduleEditor.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { getActiveProjectId } from "@/utils/projects";
import { getAreaBaseFromPathname } from "@/utils/route-base";
import {
  createSchedule,
  fetchScheduleFull,
  createSession,
  deleteSession,
  updateSessionHoliday,
  upsertAssignments,
} from "@/integrations/supabase/oficina-schedules";
import { fetchClassesRemote } from "@/integrations/supabase/classes";
import { fetchTeachers } from "@/integrations/supabase/teachers";
import type {
  OficinaScheduleFull,
  OficinaScheduleAssignment,
} from "@/types/oficina-schedule";
import type { SchoolClass } from "@/types/class";
import type { TeacherRegistration } from "@/types/teacher";
import { showError, showSuccess } from "@/utils/toast";
import { getCoordinatorSessionLogin } from "@/utils/coordinator-auth";
import ScheduleGrid from "@/components/ScheduleGrid";

export default function ScheduleEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const base = useMemo(() => getAreaBaseFromPathname(location.pathname), [location.pathname]);
  const isEditing = !!id;

  // Creation form state
  const [weekNumber, setWeekNumber] = useState("");
  const [weekStartDate, setWeekStartDate] = useState("");

  // Loaded data
  const [full, setFull] = useState<OficinaScheduleFull | null>(null);
  const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
  const [allTeachers, setAllTeachers] = useState<TeacherRegistration[]>([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  // Session builder
  const [newSessionTurmaId, setNewSessionTurmaId] = useState("");
  const [newSessionDate, setNewSessionDate] = useState("");

  useEffect(() => {
    const projectId = getActiveProjectId();
    if (projectId) {
      fetchClassesRemote(projectId).then(setAllClasses);
    }
    fetchTeachers().then(setAllTeachers);
    if (isEditing && id) {
      fetchScheduleFull(id).then((data) => {
        setFull(data);
        setLoading(false);
      });
    }
  }, [id, isEditing]);

  // ── Creation ──────────────────────────────────────────────────────────────

  async function handleCreate() {
    const projectId = getActiveProjectId();
    if (!projectId || !weekNumber || !weekStartDate) {
      showError("Preencha o número da semana e a data de início.");
      return;
    }
    setSaving(true);
    try {
      const createdBy = getCoordinatorSessionLogin() ?? null;
      const schedule = await createSchedule(
        projectId,
        parseInt(weekNumber, 10),
        weekStartDate,
        createdBy
      );
      if (!schedule) { showError("Erro ao criar escala."); return; }
      navigate(`${base}/escalas/${schedule.id}/editar`, { replace: true });
    } catch {
      showError("Erro ao criar escala.");
    } finally {
      setSaving(false);
    }
  }

  // ── Session management ────────────────────────────────────────────────────

  async function handleAddSession() {
    if (!full || !newSessionTurmaId || !newSessionDate) {
      showError("Selecione a turma e a data da sessão.");
      return;
    }
    try {
      const session = await createSession({
        scheduleId: full.schedule.id,
        turmaId: newSessionTurmaId,
        date: newSessionDate,
        isHoliday: false,
      });
      if (!session) { showError("Erro ao adicionar sessão."); return; }
      setFull((prev) =>
        prev ? { ...prev, sessions: [...prev.sessions, session] } : prev
      );
      setNewSessionTurmaId("");
      setNewSessionDate("");
    } catch {
      showError("Erro ao adicionar sessão.");
    }
  }

  async function handleRemoveSession(sessionId: string) {
    if (!confirm("Remover esta sessão? As atribuições serão perdidas.")) return;
    try {
      await deleteSession(sessionId);
      setFull((prev) =>
        prev
          ? {
              ...prev,
              sessions: prev.sessions.filter((s) => s.id !== sessionId),
              assignments: prev.assignments.filter((a) => a.sessionId !== sessionId),
            }
          : prev
      );
    } catch {
      showError("Erro ao remover sessão.");
    }
  }

  async function handleToggleHoliday(sessionId: string, isHoliday: boolean) {
    try {
      await updateSessionHoliday(sessionId, isHoliday);
      setFull((prev) =>
        prev
          ? {
              ...prev,
              sessions: prev.sessions.map((s) =>
                s.id === sessionId ? { ...s, isHoliday } : s
              ),
            }
          : prev
      );
    } catch {
      showError("Erro ao atualizar feriado.");
    }
  }

  // ── Assignments ───────────────────────────────────────────────────────────

  async function handleSaveAssignments(
    assignments: Omit<OficinaScheduleAssignment, "id">[]
  ) {
    setSaving(true);
    try {
      await upsertAssignments(assignments);
      showSuccess("Escala salva.");
    } catch {
      showError("Erro ao salvar escala.");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl bg-white shadow-sm border border-slate-100"
          onClick={() => navigate(`${base}/escalas`)}
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Button>
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">
            {isEditing
              ? `${full?.schedule.weekNumber}ª Semana`
              : "Nova Escala"}
          </h1>
          <p className="text-slate-500 font-medium">
            {isEditing ? "Edite as atribuições da escala." : "Configure a nova escala semanal."}
          </p>
        </div>
      </div>

      {/* Creation form */}
      {!isEditing && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-slate-800">Dados da semana</h2>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1.5">
              <Label>Número da semana</Label>
              <Input
                type="number"
                min={1}
                placeholder="Ex: 24"
                value={weekNumber}
                onChange={(e) => setWeekNumber(e.target.value)}
                className="w-36"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data de início (Segunda-feira)</Label>
              <Input
                type="date"
                value={weekStartDate}
                onChange={(e) => setWeekStartDate(e.target.value)}
                className="w-44"
              />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Criar escala e adicionar sessões
          </Button>
        </div>
      )}

      {/* Session manager */}
      {isEditing && full && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-slate-800">Sessões (turma × dia)</h2>

          {full.sessions.length > 0 && (
            <div className="rounded-xl border border-slate-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left">Turma</th>
                    <th className="px-4 py-2 text-left">Data</th>
                    <th className="px-4 py-2 text-left">Feriado</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {full.sessions
                    .slice()
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((session) => {
                      const turma = allClasses.find((c) => c.id === session.turmaId);
                      return (
                        <tr key={session.id} className="border-t border-slate-50">
                          <td className="px-4 py-2">{turma?.name ?? session.turmaId}</td>
                          <td className="px-4 py-2">
                            {new Date(session.date + "T12:00:00").toLocaleDateString("pt-BR")}
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={session.isHoliday}
                              onChange={(e) =>
                                handleToggleHoliday(session.id, e.target.checked)
                              }
                            />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-400 hover:text-red-600"
                              onClick={() => handleRemoveSession(session.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <Label>Turma</Label>
              <Select value={newSessionTurmaId} onValueChange={setNewSessionTurmaId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Selecionar turma" />
                </SelectTrigger>
                <SelectContent>
                  {allClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input
                type="date"
                value={newSessionDate}
                onChange={(e) => setNewSessionDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button variant="outline" className="gap-1.5" onClick={handleAddSession}>
              <Plus className="h-4 w-4" />
              Adicionar sessão
            </Button>
          </div>
        </div>
      )}

      {/* Schedule grid */}
      {isEditing && full && full.sessions.length > 0 && (
        <ScheduleGrid
          full={full}
          allClasses={allClasses}
          allTeachers={allTeachers}
          saving={saving}
          onSave={handleSaveAssignments}
        />
      )}
    </div>
  );
}
