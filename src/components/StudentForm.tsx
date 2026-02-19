"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  User, ShieldAlert, School, MapPin, HeartPulse, Camera, FileText, 
  CheckCircle2, ArrowLeft, Save, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { showSuccess } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import { differenceInYears, parseISO } from 'date-fns';
import { StudentRegistration } from '@/types/student';

const formSchema = z.object({
  fullName: z.string().min(3, "Nome muito curto"),
  socialName: z.string().optional(),
  preferredName: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  cpf: z.string().optional(),
  birthDate: z.string().min(1, "Obrigatório"),
  age: z.number().min(0),
  phone: z.string().min(1, "Obrigatório"),
  cellPhone: z.string().min(1, "Obrigatório"),
  gender: z.string().min(1, "Selecione o gênero"),
  genderOther: z.string().optional(),
  race: z.string().min(1, "Selecione a cor/raça"),
  photo: z.string().optional(),
  
  guardianName: z.string().optional(),
  guardianKinship: z.string().optional(),
  guardianPhone: z.string().optional(),

  schoolType: z.string().min(1, "Selecione a rede"),
  schoolName: z.string().min(1, "Selecione a escola"),
  schoolOther: z.string().optional(),

  cep: z.string().min(8, "CEP inválido"),
  street: z.string().min(1, "Obrigatório"),
  number: z.string().min(1, "Obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, "Obrigatório"),
  city: z.string().default("Armação dos Búzios"),
  uf: z.string().default("RJ"),

  bloodType: z.string().optional(),
  hasAllergy: z.boolean().default(false),
  allergyDetail: z.string().optional(),
  hasSpecialNeeds: z.boolean().default(false),
  specialNeedsDetail: z.string().optional(),
  usesMedication: z.boolean().default(false),
  medicationDetail: z.string().optional(),
  hasPhysicalRestriction: z.boolean().default(false),
  physicalRestrictionDetail: z.string().optional(),
  practicedActivity: z.boolean().default(false),
  practicedActivityDetail: z.string().optional(),
  familyHeartHistory: z.boolean().default(false),
  healthProblems: z.array(z.string()).default([]),
  healthProblemsOther: z.string().optional(),
  observations: z.string().optional(),

  imageAuthorization: z.string().min(1, "Obrigatório"),
  docsDelivered: z.array(z.string()).default([]),
});

interface StudentFormProps {
  initialData?: StudentRegistration | null;
}

const StudentForm = ({ initialData }: StudentFormProps) => {
  const navigate = useNavigate();
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialData?.photo || null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      city: "Armação dos Búzios",
      uf: "RJ",
      healthProblems: [],
      docsDelivered: [],
      age: 0,
    },
  });

  const birthDate = form.watch('birthDate');
  const cep = form.watch('cep');
  const age = form.watch('age');

  useEffect(() => {
    if (birthDate) {
      try {
        const calculatedAge = differenceInYears(new Date(), parseISO(birthDate));
        form.setValue('age', calculatedAge);
      } catch (e) {}
    }
  }, [birthDate, form]);

  useEffect(() => {
    const fetchCep = async () => {
      const cleanCep = cep?.replace(/\D/g, '');
      if (cleanCep?.length === 8) {
        try {
          const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
          const data = await response.json();
          if (!data.erro) {
            form.setValue('street', data.logradouro);
            form.setValue('neighborhood', data.bairro);
            form.setValue('city', data.localidade);
            form.setValue('uf', data.uf);
          }
        } catch (e) {}
      }
    };
    fetchCep();
  }, [cep, form]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPhotoPreview(base64);
        form.setValue('photo', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    const existingStudents = JSON.parse(localStorage.getItem('ecobuzios_students') || '[]');
    
    if (initialData) {
      const updated = existingStudents.map((s: any) => 
        s.id === initialData.id ? { ...s, ...values } : s
      );
      localStorage.setItem('ecobuzios_students', JSON.stringify(updated));
      showSuccess("Dados atualizados!");
    } else {
      const year = new Date().getFullYear();
      const yearStudents = existingStudents.filter((s: any) => s.registration?.startsWith(year.toString()));
      const nextNumber = yearStudents.length + 1;
      const registration = `${year}-${nextNumber.toString().padStart(4, '0')}`;

      const newStudent = {
        ...values,
        id: crypto.randomUUID(),
        registrationDate: new Date().toISOString(),
        registration: registration,
        status: 'Ativo',
        class: 'A definir'
      };
      localStorage.setItem('ecobuzios_students', JSON.stringify([...existingStudents, newStudent]));
      showSuccess("Inscrição realizada!");
    }
    navigate('/alunos');
  }

  const SectionHeader = ({ icon: Icon, title, subtitle }: { icon: any, title: string, subtitle: string }) => (
    <div className="flex items-center gap-4 mb-6">
      <div className="bg-primary/10 p-3 rounded-2xl">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div>
        <h3 className="text-lg font-black text-primary uppercase tracking-tight">{title}</h3>
        <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
      </div>
    </div>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-5xl mx-auto pb-20">
        
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="relative group">
            <div className="w-32 h-32 rounded-[2.5rem] bg-slate-100 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <User className="h-12 w-12 text-slate-300" />
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-xl cursor-pointer shadow-lg hover:scale-110 transition-transform">
              <Camera className="h-4 w-4" />
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </label>
          </div>
          <p className="text-xs font-bold text-slate-400 mt-3 uppercase tracking-widest">Foto do Aluno</p>
        </div>

        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8">
            <SectionHeader icon={User} title="1. Dados Gerais" subtitle="Identificação básica" />
            <div className="grid gap-6 md:grid-cols-3">
              <FormField control={form.control} name="fullName" render={({ field }) => (
                <FormItem className="md:col-span-3"><FormLabel className="font-bold">Nome Completo *</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="socialName" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">Nome Social</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="preferredName" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel className="font-bold">Como gostaria de ser chamado(a)?</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">E-mail</FormLabel><FormControl><Input type="email" {...field} className="rounded-xl" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="cpf" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">CPF</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} className="rounded-xl" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="birthDate" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">Data de Nascimento *</FormLabel><FormControl><Input type="date" {...field} className="rounded-xl" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="age" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">Idade</FormLabel><FormControl><Input type="number" {...field} disabled className="rounded-xl bg-slate-50 font-bold text-primary" /></FormControl></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel className="font-bold">Telefone *</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="cellPhone" render={({ field }) => (
                  <FormItem><FormLabel className="font-bold">Celular *</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="gender" render={({ field }) => (
                <FormItem className="md:col-span-3"><FormLabel className="font-bold">Gênero *</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-6 mt-2">{['Mulher cis', 'Mulher trans', 'Homem cis', 'Homem trans', 'Outro'].map((g) => (<div key={g} className="flex items-center space-x-2"><RadioGroupItem value={g} id={`gender-${g}`} /><label htmlFor={`gender-${g}`} className="text-sm font-medium">{g}</label></div>))}</RadioGroup></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="race" render={({ field }) => (
                <FormItem className="md:col-span-3"><FormLabel className="font-bold">Cor/Raça *</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-6 mt-2">{['Branca', 'Preta', 'Amarela', 'Parda', 'Indígena'].map((r) => (<div key={r} className="flex items-center space-x-2"><RadioGroupItem value={r} id={`race-${r}`} /><label htmlFor={`race-${r}`} className="text-sm font-medium">{r}</label></div>))}</RadioGroup></FormControl></FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        {age < 18 && (
          <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-8">
              <SectionHeader icon={ShieldAlert} title="2. Responsável" subtitle="Obrigatório para menores" />
              <div className="grid gap-6 md:grid-cols-3">
                <FormField control={form.control} name="guardianName" render={({ field }) => (
                  <FormItem className="md:col-span-2"><FormLabel className="font-bold">Nome Completo *</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="guardianKinship" render={({ field }) => (
                  <FormItem><FormLabel className="font-bold">Parentesco *</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="guardianPhone" render={({ field }) => (
                  <FormItem><FormLabel className="font-bold">Telefone *</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl></FormItem>
                )} />
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8">
            <SectionHeader icon={School} title="3. Escola" subtitle="Vínculo atual" />
            <div className="grid gap-6 md:grid-cols-2">
              <FormField control={form.control} name="schoolType" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">Rede *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl><SelectContent><SelectItem value="municipal">Municipal</SelectItem><SelectItem value="state">Estadual</SelectItem><SelectItem value="private">Particular</SelectItem><SelectItem value="higher">Superior</SelectItem></SelectContent></Select></FormItem>
              )} />
              <FormField control={form.control} name="schoolName" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">Unidade *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl><SelectContent>{form.watch('schoolType') === 'municipal' ? (<><SelectItem value="Paulo Freire">Paulo Freire</SelectItem><SelectItem value="José Bento">José Bento</SelectItem><SelectItem value="Regina Silveira">Regina Silveira</SelectItem></>) : <SelectItem value="outra">Outra</SelectItem>}</SelectContent></Select></FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8">
            <SectionHeader icon={MapPin} title="4. Endereço" subtitle="Local de residência" />
            <div className="grid gap-6 md:grid-cols-4">
              <FormField control={form.control} name="cep" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">CEP *</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="street" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel className="font-bold">Logradouro *</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="number" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">Número *</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="neighborhood" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">Bairro *</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4"><FormItem><FormLabel className="font-bold">Cidade</FormLabel><Input value={form.watch('city')} disabled className="rounded-xl bg-slate-50" /></FormItem><FormItem><FormLabel className="font-bold">UF</FormLabel><Input value={form.watch('uf')} disabled className="rounded-xl bg-slate-50" /></FormItem></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8">
            <SectionHeader icon={HeartPulse} title="5. Saúde" subtitle="Dados médicos" />
            <div className="grid gap-8 md:grid-cols-2">
              <FormField control={form.control} name="bloodType" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">Tipo Sanguíneo</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl></FormItem>
              )} />
              {[{ name: 'hasAllergy', label: 'Alergia?', detail: 'allergyDetail' }, { name: 'hasSpecialNeeds', label: 'Nec. Especiais?', detail: 'specialNeedsDetail' }].map((item) => (
                <div key={item.name} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <FormField control={form.control} name={item.name as any} render={({ field }) => (
                    <FormItem className="flex items-center justify-between"><FormLabel className="font-bold">{item.label}</FormLabel><FormControl><RadioGroup onValueChange={(v) => field.onChange(v === 'true')} className="flex gap-4"><div className="flex items-center space-x-2"><RadioGroupItem value="false" id={`${item.name}-no`} /><label htmlFor={`${item.name}-no`}>Não</label></div><div className="flex items-center space-x-2"><RadioGroupItem value="true" id={`${item.name}-yes`} /><label htmlFor={`${item.name}-yes`}>Sim</label></div></RadioGroup></FormControl></FormItem>
                  )} />
                  {form.watch(item.name as any) && <FormField control={form.control} name={item.detail as any} render={({ field }) => (<FormItem className="mt-2"><FormControl><Input {...field} className="rounded-xl bg-white" /></FormControl></FormItem>)} />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <SectionHeader icon={Camera} title="6. Imagem" subtitle="Autorização" />
              <Dialog><DialogTrigger asChild><Button variant="outline" size="sm" className="rounded-xl gap-2"><Info className="h-4 w-4" />Termo</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Termo de Imagem</DialogTitle></DialogHeader><div className="text-sm text-slate-600 p-4">Autorizo a EcoBúzios a utilizar imagem e voz para fins institucionais.</div></DialogContent></Dialog>
            </div>
            <FormField control={form.control} name="imageAuthorization" render={({ field }) => (
              <FormItem><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col gap-4"><div className="flex items-center space-x-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100"><RadioGroupItem value="authorized" id="img-auth" /><label htmlFor="img-auth" className="text-sm font-bold text-emerald-800">Autorizo</label></div><div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-2xl border border-slate-100"><RadioGroupItem value="not_authorized" id="img-no-auth" /><label htmlFor="img-no-auth" className="text-sm font-bold text-slate-600">Não autorizo</label></div></RadioGroup></FormControl></FormItem>
            )} />
          </CardContent>
        </Card>

        <div className="bg-primary/5 p-8 rounded-[2.5rem] border border-primary/10 text-center space-y-6">
          <div className="flex justify-center"><CheckCircle2 className="h-12 w-12 text-primary" /></div>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-4">
            <Button type="button" variant="outline" className="rounded-2xl px-8 h-12 font-bold" onClick={() => navigate('/alunos')}>Cancelar</Button>
            <Button type="submit" className="rounded-2xl px-12 h-12 font-black gap-2 shadow-xl shadow-primary/20"><Save className="h-4 w-4" />{initialData ? 'Salvar Alterações' : 'Finalizar Inscrição'}</Button>
          </div>
        </div>
      </form>
    </Form>
  );
};

export default StudentForm;