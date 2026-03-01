"use client";

import React, { useMemo } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  BookOpen, Clock, Users, AlertCircle, Save, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { showSuccess } from '@/utils/toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { SchoolClass } from '@/types/class';
import { readScoped, writeScoped } from '@/utils/storage';
import { getActiveProjectId } from '@/utils/projects';
import { upsertClassRemote } from '@/integrations/supabase/classes';

const formSchema = z.object({
  name: z.string().min(2, "Nome da turma é obrigatório"),
  period: z.enum(['Manhã', 'Tarde', 'Noite'], { required_error: "Selecione o período" }),
  startTime: z.string().min(1, "Horário de início é obrigatório"),
  endTime: z.string().min(1, "Horário de término é obrigatório"),
  capacity: z.string().min(1, "Defina a quantidade de vagas"),
  absenceLimit: z.string().min(1, "Defina o limite de faltas"),
});

interface ClassFormProps {
  initialData?: SchoolClass | null;
}

const ClassForm = ({ initialData }: ClassFormProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isTeacherArea = useMemo(() => location.pathname.startsWith('/professor'), [location.pathname]);
  const base = isTeacherArea ? '/professor' : '';
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      ...initialData,
      capacity: initialData.capacity.toString(),
      absenceLimit: initialData.absenceLimit.toString(),
    } : {
      name: "",
      period: undefined,
      startTime: "",
      endTime: "",
      capacity: "",
      absenceLimit: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const run = async () => {
      const projectId = getActiveProjectId();
      if (!projectId) return;

      const existing = readScoped<SchoolClass[]>('classes', []);

      const classData = {
        ...values,
        capacity: parseInt(values.capacity),
        absenceLimit: parseInt(values.absenceLimit),
      };

      if (initialData) {
        const updatedLocal = existing.map((c: any) =>
          c.id === initialData.id ? { ...c, ...classData } : c,
        );

        const updatedRemote: SchoolClass = {
          ...(initialData as any),
          ...classData,
        };

        try {
          await upsertClassRemote(projectId, updatedRemote);
        } catch {
          // mantém cache local se falhar
        }

        writeScoped('classes', updatedLocal);
        showSuccess("Turma atualizada!");
      } else {
        const newClass: SchoolClass = {
          ...(classData as any),
          id: crypto.randomUUID(),
          registrationDate: new Date().toISOString(),
          status: 'Ativo',
        };

        try {
          await upsertClassRemote(projectId, newClass);
        } catch {
          // mantém cache local se falhar
        }

        writeScoped('classes', [...existing, newClass]);
        showSuccess("Turma criada com sucesso!");
      }
      navigate(`${base}/turmas`);
    };

    void run();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-4xl mx-auto pb-20">
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-10">
            <div className="flex items-center gap-4 mb-10 border-b border-slate-100 pb-6">
              <div className="bg-primary/10 p-3 rounded-2xl">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-black text-primary uppercase tracking-tight">Adicionar Turma</h3>
            </div>

            <div className="space-y-8">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="grid grid-cols-1 md:grid-cols-4 items-center gap-4 space-y-0">
                  <FormLabel className="font-bold text-slate-700">Nome</FormLabel>
                  <FormControl className="md:col-span-3">
                    <Input placeholder="Nome da Turma" {...field} className="h-12 rounded-xl bg-slate-50/50 border-slate-100" />
                  </FormControl>
                  <FormMessage className="md:col-start-2 md:col-span-3" />
                </FormItem>
              )} />

              <FormField control={form.control} name="period" render={({ field }) => (
                <FormItem className="grid grid-cols-1 md:grid-cols-4 items-center gap-4 space-y-0">
                  <FormLabel className="font-bold text-slate-700">Período *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl className="md:col-span-3">
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50/50 border-slate-100">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Manhã">Manhã</SelectItem>
                      <SelectItem value="Tarde">Tarde</SelectItem>
                      <SelectItem value="Noite">Noite</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="md:col-start-2 md:col-span-3" />
                </FormItem>
              )} />

              <FormField control={form.control} name="startTime" render={({ field }) => (
                <FormItem className="grid grid-cols-1 md:grid-cols-4 items-center gap-4 space-y-0">
                  <FormLabel className="font-bold text-slate-700">Início da aula *</FormLabel>
                  <FormControl className="md:col-span-3">
                    <Input type="time" {...field} className="h-12 rounded-xl bg-slate-50/50 border-slate-100" />
                  </FormControl>
                  <FormMessage className="md:col-start-2 md:col-span-3" />
                </FormItem>
              )} />

              <FormField control={form.control} name="endTime" render={({ field }) => (
                <FormItem className="grid grid-cols-1 md:grid-cols-4 items-center gap-4 space-y-0">
                  <FormLabel className="font-bold text-slate-700">Término da aula *</FormLabel>
                  <FormControl className="md:col-span-3">
                    <Input type="time" {...field} className="h-12 rounded-xl bg-slate-50/50 border-slate-100" />
                  </FormControl>
                  <FormMessage className="md:col-start-2 md:col-span-3" />
                </FormItem>
              )} />

              <FormField control={form.control} name="capacity" render={({ field }) => (
                <FormItem className="grid grid-cols-1 md:grid-cols-4 items-center gap-4 space-y-0">
                  <FormLabel className="font-bold text-slate-700">Quantidade de Vagas *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl className="md:col-span-3">
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50/50 border-slate-100">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0" className="font-bold text-primary">Ilimitado</SelectItem>
                      {[10, 15, 20, 25, 30, 35, 40, 50].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n} vagas</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="md:col-start-2 md:col-span-3" />
                </FormItem>
              )} />

              <FormField control={form.control} name="absenceLimit" render={({ field }) => (
                <FormItem className="grid grid-cols-1 md:grid-cols-4 items-center gap-4 space-y-0">
                  <FormLabel className="font-bold text-slate-700">Limite de falta *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl className="md:col-span-3">
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50/50 border-slate-100">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[0, 1, 2, 3, 4, 5, 10, 15].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n} faltas</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="md:col-start-2 md:col-span-3" />
                </FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4">
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl px-8 h-12 font-bold"
            onClick={() => navigate(`${base}/turmas`) }
          >
            Cancelar
          </Button>
          <Button type="submit" className="rounded-2xl px-12 h-12 font-black gap-2 shadow-xl shadow-primary/20">
            <Save className="h-4 w-4" />
            {initialData ? 'Salvar Alterações' : 'Criar Turma'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ClassForm;