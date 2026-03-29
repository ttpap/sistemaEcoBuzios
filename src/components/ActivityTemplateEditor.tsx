// src/components/ActivityTemplateEditor.tsx

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2, Plus } from "lucide-react";
import {
  fetchTemplatesByTurma,
  upsertTemplates,
} from "@/integrations/supabase/oficina-schedules";
import type { OficinaActivityTemplate } from "@/types/oficina-schedule";
import { showError, showSuccess } from "@/utils/toast";

interface ActivityTemplateEditorProps {
  turmaId: string;
}

type DraftActivity = {
  _key: string;
  name: string;
  durationMinutes: string; // string for input, "" = sem tempo fixo
};

export default function ActivityTemplateEditor({
  turmaId,
}: ActivityTemplateEditorProps) {
  const [activities, setActivities] = useState<DraftActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchTemplatesByTurma(turmaId)
      .then((templates) => {
        setActivities(
          templates.map((t) => ({
            _key: crypto.randomUUID(),
            name: t.name,
            durationMinutes: t.durationMinutes != null ? String(t.durationMinutes) : "",
          }))
        );
        setLoading(false);
      })
      .catch(() => {
        showError("Erro ao carregar atividades.");
        setLoading(false);
      });
  }, [turmaId]);

  function addActivity() {
    setActivities((prev) => [...prev, { _key: crypto.randomUUID(), name: "", durationMinutes: "" }]);
  }

  function removeActivity(index: number) {
    setActivities((prev) => prev.filter((_, i) => i !== index));
  }

  function updateActivity(
    index: number,
    field: keyof DraftActivity,
    value: string
  ) {
    setActivities((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [field]: value } : a))
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const templates = activities
        .filter((a) => a.name.trim() !== "")
        .map((a, i) => ({
          name: a.name.trim(),
          durationMinutes: (() => { const parsed = parseInt(a.durationMinutes, 10); return a.durationMinutes !== "" && !Number.isNaN(parsed) ? parsed : null; })(),
          orderIndex: i,
        }));
      await upsertTemplates(turmaId, templates);
      showSuccess("Atividades salvas com sucesso.");
    } catch {
      showError("Erro ao salvar atividades.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando atividades...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Defina as atividades desta turma. Elas aparecerão como linhas na escala
        semanal.
      </p>

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Atividade</th>
              <th className="px-3 py-2 text-left font-medium w-32">
                Duração (min)
              </th>
              <th className="w-10 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {activities.map((activity, index) => (
              <tr key={activity._key} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  <Input
                    value={activity.name}
                    onChange={(e) =>
                      updateActivity(index, "name", e.target.value)
                    }
                    placeholder="Nome da atividade"
                    className="h-8 text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min={1}
                    value={activity.durationMinutes}
                    onChange={(e) =>
                      updateActivity(index, "durationMinutes", e.target.value)
                    }
                    placeholder="—"
                    className="h-8 text-sm w-20"
                  />
                </td>
                <td className="px-3 py-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-400 hover:text-red-500"
                    onClick={() => removeActivity(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {activities.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-4 text-center text-slate-400 text-sm"
                >
                  Nenhuma atividade configurada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={addActivity}
        >
          <Plus className="h-4 w-4" />
          Adicionar atividade
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Salvar atividades
        </Button>
      </div>
    </div>
  );
}
