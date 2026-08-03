"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  ExternalLink,
  FileSignature,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  XCircle,
  Clock,
} from "lucide-react";

const STATUS_META: Record<
  EditalStatus,
  { label: string; badge: string; icon: React.ComponentType<{ className?: string }> }
> = {
  inscrito: {
    label: "Inscrito",
    badge: "bg-sky-100 text-sky-800 border border-sky-200",
    icon: Clock,
  },
  aprovado: {
    label: "Aprovado",
    badge: "bg-emerald-600 text-white border-none",
    icon: CheckCircle2,
  },
  reprovado: {
    label: "Reprovado",
    badge: "bg-rose-600 text-white border-none",
    icon: XCircle,
  },
};

function formatDate(d?: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
}

function formatCurrency(v?: number | null) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

type FormState = {
  title: string;
  agency: string;
  notice_number: string;
  url: string;
  amount: string;
  submission_date: string;
  result_date: string;
  status: EditalStatus;
  notes: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  agency: "",
  notice_number: "",
  url: "",
  amount: "",
  submission_date: "",
  result_date: "",
  status: "inscrito",
  notes: "",
};

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
      title: e.title || "",
      agency: e.agency || "",
      notice_number: e.notice_number || "",
      url: e.url || "",
      amount: e.amount != null ? String(e.amount) : "",
      submission_date: e.submission_date || "",
      result_date: e.result_date || "",
      status: e.status,
      notes: e.notes || "",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      showError("Informe o nome do edital.");
      return;
    }
    const payload: EditalInput = {
      title: form.title.trim(),
      agency: form.agency.trim() || null,
      notice_number: form.notice_number.trim() || null,
      url: form.url.trim() || null,
      amount: form.amount.trim() ? Number(form.amount.replace(",", ".")) : null,
      submission_date: form.submission_date || null,
      result_date: form.result_date || null,
      status: form.status,
      notes: form.notes.trim() || null,
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
        <div className="grid gap-4 md:grid-cols-2">
          {editais.map((e) => {
            const meta = STATUS_META[e.status];
            const StatusIcon = meta.icon;
            return (
              <Card
                key={e.id}
                className="border border-slate-100 bg-white rounded-[2rem] overflow-hidden shadow-sm"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-lg font-black text-slate-800 leading-tight">{e.title}</p>
                      {e.agency && <p className="text-sm font-bold text-slate-500 mt-0.5">{e.agency}</p>}
                    </div>
                    <Badge className={cn("rounded-full font-black shrink-0", meta.badge)}>
                      <StatusIcon className="h-3.5 w-3.5 mr-1" />
                      {meta.label}
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {e.notice_number && (
                      <div>
                        <span className="text-slate-400 font-bold">Nº: </span>
                        <span className="text-slate-700 font-bold">{e.notice_number}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400 font-bold">Valor: </span>
                      <span className="text-slate-700 font-bold">{formatCurrency(e.amount)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold">Inscrição: </span>
                      <span className="text-slate-700 font-bold">{formatDate(e.submission_date)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold">Resultado: </span>
                      <span className="text-slate-700 font-bold">{formatDate(e.result_date)}</span>
                    </div>
                  </div>

                  {e.notes && (
                    <p className="mt-3 text-sm text-slate-600 font-medium whitespace-pre-wrap">{e.notes}</p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {e.url && (
                      <a
                        href={e.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-100"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Abrir edital
                      </a>
                    )}
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
                    <div className="ml-auto flex items-center gap-1">
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
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-[2rem] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-primary">
              {editingId ? "Editar edital" : "Novo edital"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Nome do edital *</label>
              <Input
                value={form.title}
                onChange={(ev) => setForm((f) => ({ ...f, title: ev.target.value }))}
                placeholder="Ex.: Edital de Fomento à Cultura 2026"
                className="mt-1 h-11 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Órgão / instituição</label>
                <Input
                  value={form.agency}
                  onChange={(ev) => setForm((f) => ({ ...f, agency: ev.target.value }))}
                  placeholder="Ex.: FUNARTE"
                  className="mt-1 h-11 rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Nº do edital</label>
                <Input
                  value={form.notice_number}
                  onChange={(ev) => setForm((f) => ({ ...f, notice_number: ev.target.value }))}
                  placeholder="Ex.: 01/2026"
                  className="mt-1 h-11 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Link do edital</label>
              <Input
                value={form.url}
                onChange={(ev) => setForm((f) => ({ ...f, url: ev.target.value }))}
                placeholder="https://..."
                className="mt-1 h-11 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Valor pleiteado (R$)</label>
                <Input
                  value={form.amount}
                  onChange={(ev) => setForm((f) => ({ ...f, amount: ev.target.value }))}
                  inputMode="decimal"
                  placeholder="Ex.: 50000"
                  className="mt-1 h-11 rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Status</label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as EditalStatus }))}
                >
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Data da inscrição</label>
                <Input
                  type="date"
                  value={form.submission_date}
                  onChange={(ev) => setForm((f) => ({ ...f, submission_date: ev.target.value }))}
                  className="mt-1 h-11 rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Data do resultado</label>
                <Input
                  type="date"
                  value={form.result_date}
                  onChange={(ev) => setForm((f) => ({ ...f, result_date: ev.target.value }))}
                  className="mt-1 h-11 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Observações</label>
              <Textarea
                value={form.notes}
                onChange={(ev) => setForm((f) => ({ ...f, notes: ev.target.value }))}
                placeholder="Anotações sobre o edital, contrapartidas, prazos..."
                className="mt-1 rounded-xl min-h-[80px]"
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
