"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { showError, showSuccess } from "@/utils/toast";
import {
  createEdital,
  deleteEdital,
  fetchEditais,
  updateEdital,
  type Edital,
  type EditalInput,
  type EditalStatus,
} from "@/services/editaisService";
import {
  CheckCircle2,
  Clock,
  FileSignature,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";

const STATUS_META: Record<
  EditalStatus,
  { label: string; badge: string; icon: React.ComponentType<{ className?: string }> }
> = {
  inscrito: { label: "Inscrito", badge: "bg-sky-100 text-sky-800 border border-sky-200", icon: Clock },
  aprovado: { label: "Aprovado", badge: "bg-emerald-600 text-white border-none", icon: CheckCircle2 },
  reprovado: { label: "Reprovado", badge: "bg-rose-600 text-white border-none", icon: XCircle },
};

type FormState = {
  code: string;
  applicant_name: string;
  title: string;
  situation: string;
  status: EditalStatus;
};

const EMPTY_FORM: FormState = { code: "", applicant_name: "", title: "", situation: "", status: "inscrito" };

export default function Editais() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const [editais, setEditais] = useState<Edital[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setEditais(await fetchEditais());
    } catch (e: any) {
      showError(e?.message || "Não foi possível carregar os editais.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) void load();
    else setLoading(false);
  }, [isAdmin]);

  const counts = useMemo(() => {
    const c = { total: editais.length, inscrito: 0, aprovado: 0, reprovado: 0 };
    for (const e of editais) c[e.status] += 1;
    return c;
  }, [editais]);

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (e: Edital) => {
    setEditingId(e.id);
    setForm({
      code: e.code || "",
      applicant_name: e.applicant_name || "",
      title: e.title || "",
      situation: e.situation || "",
      status: e.status,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      showError("Informe o título do edital.");
      return;
    }
    const payload: EditalInput = {
      code: form.code.trim() || null,
      applicant_name: form.applicant_name.trim() || null,
      title: form.title.trim(),
      situation: form.situation.trim() || null,
      status: form.status,
    };

    setSaving(true);
    try {
      if (editingId) await updateEdital(editingId, payload);
      else await createEdital(payload);
      setDialogOpen(false);
      showSuccess(editingId ? "Edital atualizado." : "Edital registrado.");
      await load();
    } catch (e: any) {
      showError(e?.message || "Não foi possível salvar o edital.");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (e: Edital, status: EditalStatus) => {
    try {
      await updateEdital(e.id, { status });
      setEditais((prev) => prev.map((x) => (x.id === e.id ? { ...x, status } : x)));
      showSuccess(`Marcado como ${STATUS_META[status].label}.`);
    } catch (err: any) {
      showError(err?.message || "Não foi possível atualizar o status.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteEdital(deleteId);
      setEditais((prev) => prev.filter((x) => x.id !== deleteId));
      showSuccess("Edital excluído.");
    } catch (e: any) {
      showError(e?.message || "Não foi possível excluir o edital.");
    } finally {
      setDeleteId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden max-w-lg w-full">
          <CardContent className="p-8">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">403</p>
            <h1 className="mt-2 text-2xl font-black text-slate-900">Não autorizado</h1>
            <p className="mt-2 text-sm font-medium text-slate-600">
              O registro de Editais está disponível apenas para o Administrador.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Administração</p>
          <h1 className="text-3xl font-black text-primary tracking-tight flex items-center gap-2">
            <FileSignature className="h-6 w-6" /> Editais
          </h1>
          <p className="text-slate-500 font-medium">
            Registre os editais em que se inscreveu e marque o resultado.
          </p>
        </div>
        <Button className="rounded-2xl gap-2 h-11 font-black shadow-lg shadow-primary/20" onClick={openNew}>
          <Plus className="h-4 w-4" /> Novo edital
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {[
          { label: "Total", value: counts.total, cls: "bg-slate-100 text-slate-700 border-slate-200" },
          { label: "Inscritos", value: counts.inscrito, cls: "bg-sky-50 text-sky-800 border-sky-200" },
          { label: "Aprovados", value: counts.aprovado, cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
          { label: "Reprovados", value: counts.reprovado, cls: "bg-rose-50 text-rose-800 border-rose-200" },
        ].map((s) => (
          <div key={s.label} className={cn("rounded-2xl border px-4 py-3", s.cls)}>
            <p className="text-2xl font-black leading-none">{s.value}</p>
            <p className="text-xs font-bold mt-1 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-slate-500 font-bold">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando editais...
        </div>
      ) : editais.length === 0 ? (
        <Card className="border-none shadow-xl shadow-slate-200/40 bg-white rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-10 text-center">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/15">
              <FileSignature className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm font-black text-slate-700">Nenhum edital registrado.</p>
            <p className="text-xs font-bold text-slate-500 mt-1">Clique em “Novo edital” para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {editais.map((e) => {
            const meta = STATUS_META[e.status];
            const StatusIcon = meta.icon;
            return (
              <Card key={e.id} className="border border-slate-100 bg-white rounded-[1.75rem] overflow-hidden shadow-sm">
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-start gap-3">
                    <Badge className={cn("rounded-full font-black shrink-0", meta.badge)}>
                      <StatusIcon className="h-3.5 w-3.5 mr-1" />
                      {meta.label}
                    </Badge>
                    <p className="min-w-0 flex-1 text-sm md:text-base font-bold text-slate-700 leading-relaxed">
                      {e.code && <span className="font-black text-slate-900">Código {e.code}</span>}
                      {e.code && (e.applicant_name || e.title) && <span className="text-slate-300"> — </span>}
                      {e.applicant_name && <span className="font-black text-primary">{e.applicant_name}</span>}
                      {e.applicant_name && e.title && <span className="text-slate-300"> — </span>}
                      <span className="italic">“{e.title}”</span>
                    </p>
                  </div>

                  {e.situation && (
                    <p className="mt-2 pl-1 text-sm font-bold text-slate-500">
                      <span className="text-slate-400">Situação: </span>
                      {e.situation}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5">
                    {e.status !== "aprovado" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl h-8 font-black text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        onClick={() => setStatus(e, "aprovado")}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aprovado
                      </Button>
                    )}
                    {e.status !== "reprovado" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl h-8 font-black text-rose-700 border-rose-200 hover:bg-rose-50"
                        onClick={() => setStatus(e, "reprovado")}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Reprovado
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="rounded-xl h-8 w-8 text-slate-500 hover:bg-slate-100"
                      onClick={() => openEdit(e)}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="rounded-xl h-8 w-8 text-rose-500 hover:bg-rose-50"
                      onClick={() => setDeleteId(e.id)}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-[2rem] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-primary">
              {editingId ? "Editar edital" : "Novo edital"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Código</label>
                <Input
                  value={form.code}
                  onChange={(ev) => setForm((f) => ({ ...f, code: ev.target.value }))}
                  placeholder="Ex.: 85643"
                  className="mt-1 h-11 rounded-xl"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Status</label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as EditalStatus }))}>
                  <SelectTrigger className="mt-1 h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inscrito">Inscrito</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="reprovado">Reprovado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Nome</label>
              <Input
                value={form.applicant_name}
                onChange={(ev) => setForm((f) => ({ ...f, applicant_name: ev.target.value }))}
                placeholder="Ex.: Antonio Carlos Pap Almeida"
                className="mt-1 h-11 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Título do edital *</label>
              <Input
                value={form.title}
                onChange={(ev) => setForm((f) => ({ ...f, title: ev.target.value }))}
                placeholder="Ex.: Credenciamento de Pareceristas - 2026"
                className="mt-1 h-11 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Situação (detalhe)</label>
              <Input
                value={form.situation}
                onChange={(ev) => setForm((f) => ({ ...f, situation: ev.target.value }))}
                placeholder="Ex.: Em execução · 97 pontos · Suplente · Captação autorizada"
                className="mt-1 h-11 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-2xl font-black" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button className="rounded-2xl font-black" onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? "Salvar" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={Boolean(deleteId)} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-black text-primary">Excluir edital?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 font-medium">
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl font-black">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl font-black bg-rose-600 hover:bg-rose-700 text-white"
              onClick={confirmDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
