"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  User, ShieldAlert, School, MapPin, HeartPulse, Camera, FileText, 
  CheckCircle2, Save, Info, Plus
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
import { useLocation, useNavigate } from 'react-router-dom';
import { getAreaBaseFromPathname } from '@/utils/route-base';

import { differenceInYears, parseISO } from 'date-fns';
import { StudentRegistration } from '@/types/student';
import { readGlobalStudents, writeGlobalStudents } from '@/utils/storage';

const SCHOOLS_BY_TYPE: Record<string, string[]> = {
  municipal: [
    "E. M. Paulo Freire",
    "E. M. Darcy Ribeiro",
    "E. M. Nicomedes Theotônio dos Santos",
    "E. M. Prof. Eliete Mureb de Araújo Pinho",
    "E. M. Vereador Emigdio Gonçalves Coutinho",
    "E. M. Ciléia Maria Barreto",
    "E. M. Eva Maria da Conceição Oliveira",
    "E. M. José Bento Ribeiro Dantas",
    "E. M. Regina da Silveira Ramos e Silva",
    "E. M. Prof. Lydia Sherman",
    "E. M. Manoel da Costa Perpétuo",
    "E. M. João José de Carvalho",
    "E. M. Comendador Ideal",
    "E. M. Antônio Alípio da Silva",
    "E. M. Maria Alice de Aguiar Lodas",
    "E. M. Inefi (Instituto de Educação e Formação Integral)",
    "E. M. Vila Nova",
    "E. M. Baía Formosa",
    "E. M. Arpoador",
    "E. M. Geribá",
    "E. M. Rasa",
    "E. M. Cem Braças",
    "E. M. José Gonçalves",
    "E. M. Caravelas",
    "Outra"
  ],
  state: [
    "C. E. João de Oliveira Botas",
    "C. E. Berenice de Oliveira Martins",
    "C. E. Rui Barbosa",
    "C. E. Miguel Couto",
    "Outra"
  ],
  private: [
    "Colégio Dominus",
    "Colégio Integral",
    "Instituto de Educação de Búzios (IEB)",
    "Colégio Objetivo Búzios",
    "Escola Alternativa",
    "Colégio Sagrado Coração de Jesus",
    "Escola Mágico de Oz",
    "Centro Educacional Búzios (CEB)",
    "Escola Waldorf Búzios",
    "Colégio Pensi",
    "Colégio Ph",
    "Escola Terra Viva",
    "Centro Educacional Souza Amorim",
    "Outra"
  ],
  higher: [
    "UFF - Universidade Federal Fluminense",
    "Estácio de Sá",
    "UVA - Veiga de Almeida",
    "UNOPAR",
    "IFF - Instituto Federal Fluminense",
    "UNIFASS",
    "UNINTER",
    "Cruzeiro do Sul Virtual",
    "UNIP",
    "Outra"
  ],
  none: [
    "Não estuda no momento"
  ]
};

const HEALTH_PROBLEMS = [
  "Asma", "Diabetes", "Epilepsia", "Problemas Cardíacos", "Problemas Renais", 
  "Problemas de Visão", "Problemas de Audição", "Deficiência Motora"
];

const DOCUMENTS = [
  "RG do Aluno", "CPF do Aluno", "RG do Responsável", "CPF do Responsável", 
  "Comprovante de Residência", "Declaração Escolar", "Foto 3x4", "Atestado Médico"
];

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
  const location = useLocation();
  const base = getAreaBaseFromPathname(location.pathname);

  const [photoPreview, setPhotoPreview] = useState<string | null>(initialData?.photo || null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      city: "Armação dos Búzios",
      uf: "RJ",
      healthProblems: [],
      docsDelivered: [],
      age: 0,
      hasAllergy: false,
      hasSpecialNeeds: false,
      usesMedication: false,
      hasPhysicalRestriction: false,
      practicedActivity: false,
      familyHeartHistory: false,
    },
  });

  const birthDate = form.watch('birthDate');
  const cep = form.watch('cep');
  const schoolType = form.watch('schoolType');
  const schoolName = form.watch('schoolName');

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
    const existingStudents = readGlobalStudents<StudentRegistration[]>([]);

    const finalSchoolName = values.schoolName === "Outra" ? values.schoolOther : values.schoolName;

    const studentData = {
      ...values,
      schoolName: finalSchoolName || values.schoolName
    };

    if (initialData) {
      const updated = existingStudents.map((s: any) =>
        s.id === initialData.id ? { ...s, ...studentData } : s
      );
      writeGlobalStudents(updated);

      showSuccess("Dados atualizados!");
    } else {
      const year = new Date().getFullYear();
      const yearStudents = existingStudents.filter((s: any) => s.registration?.startsWith(year.toString()));
      const nextNumber = yearStudents.length + 1;
      const registration = `${year}-${nextNumber.toString().padStart(4, '0')}`;

      const newStudent = {
        ...studentData,
        id: crypto.randomUUID(),
        registrationDate: new Date().toISOString(),
        registration: registration,
        status: 'Ativo',
        class: 'A definir'
      };
      writeGlobalStudents([...existingStudents, newStudent]);

      showSuccess("Inscrição realizada!");
    }
    navigate(`${base}/alunos`);

  }

  const SectionHeader = ({ icon: Icon, title, subtitle }: { icon: any, title: string, subtitle: string }) => (
    <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
      <div className="bg-primary/10 p-3 rounded-2xl">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div>
        <h3 className="text-xl font-black text-primary uppercase tracking-tight">{title}</h3>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{subtitle}</p>
      </div>
    </div>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 max-w-5xl mx-auto pb-24">
        
        <div className="flex flex-col items-center justify-center mb-12">
          <div className="relative group">
            <div className="w-40 h-40 rounded-[3rem] bg-slate-100 border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <User className="h-16 w-16 text-slate-300" />
              )}
            </div>
            <label className="absolute bottom-2 right-2 bg-primary text-white p-3 rounded-2xl cursor-pointer shadow-xl hover:scale-110 transition-transform">
              <Camera className="h-5 w-5" />
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </label>
          </div>
          <p className="text-xs font-black text-slate-400 mt-4 uppercase tracking-widest">Foto Oficial do Aluno</p>
        </div>

        {/* 1. Dados Gerais */}
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[3rem] overflow-hidden">
          <CardContent className="p-10">
            <SectionHeader icon={User} title="1. Dados Gerais" subtitle="Identificação e Contato" />
            <div className="grid gap-8 md:grid-cols-3">
              <FormField control={form.control} name="fullName" render={({ field }) => (
                <FormItem className="md:col-span-3"><FormLabel className="font-bold">Nome Completo *</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl bg-slate-50/50 border-slate-100" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="socialName" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">Nome Social</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl bg-slate-50/50 border-slate-100" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="preferredName" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel className="font-bold">Como gostaria de ser chamado(a)?</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl bg-slate-50/50 border-slate-100" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">E-mail</FormLabel><FormControl><Input type="email" {...field} className="h-12 rounded-xl bg-slate-50/50 border-slate-100" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="cpf" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">CPF</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} className="h-12 rounded-xl bg-slate-50/50 border-slate-100" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="birthDate" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">Data de Nascimento *</FormLabel><FormControl><Input type="date" {...field} className="h-12 rounded-xl bg-slate-50/50 border-slate-100" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="age" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">Idade</FormLabel><FormControl><Input type="number" {...field} disabled className="h-12 rounded-xl bg-slate-100 font-black text-primary" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">Telefone Fixo</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl bg-slate-50/50 border-slate-100" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="cellPhone" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">Celular / WhatsApp *</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl bg-slate-50/50 border-slate-100" /></FormControl></FormItem>
              )} />
              
              <FormField control={form.control} name="gender" render={({ field }) => (
                <FormItem className="md:col-span-3"><FormLabel className="font-bold">Gênero *</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-8 mt-2">{['Mulher cis', 'Mulher trans', 'Homem cis', 'Homem trans', 'Não-binário', 'Outro'].map((g) => (<div key={g} className="flex items-center space-x-2"><RadioGroupItem value={g} id={`gender-${g}`} /><label htmlFor={`gender-${g}`} className="text-sm font-bold text-slate-600">{g}</label></div>))}</RadioGroup></FormControl></FormItem>
              )} />
              
              <FormField control={form.control} name="race" render={({ field }) => (
                <FormItem className="md:col-span-3"><FormLabel className="font-bold">Cor / Raça *</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-8 mt-2">{['Branca', 'Preta', 'Amarela', 'Parda', 'Indígena'].map((r) => (<div key={r} className="flex items-center space-x-2"><RadioGroupItem value={r} id={`race-${r}`} /><label htmlFor={`race-${r}`} className="text-sm font-bold text-slate-600">{r}</label></div>))}</RadioGroup></FormControl></FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        {/* 2. Responsável */}
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[3rem] overflow-hidden">
          <CardContent className="p-10">
            <SectionHeader icon={ShieldAlert} title="2. Responsável" subtitle="Dados do Tutor Legal" />
            <div className="grid gap-8 md:grid-cols-3">
              <FormField control={form.control} name="guardianName" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel className="font-bold">Nome Completo do Responsável</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl bg-slate-50/50 border-slate-100" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="guardianKinship" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">Grau de Parentesco</FormLabel><FormControl><Input placeholder="Ex: Mãe, Pai, Avó..." {...field} className="h-12 rounded-xl bg-slate-50/50 border-slate-100" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="guardianPhone" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">Telefone de Contato</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl bg-slate-50/50 border-slate-100" /></FormControl></FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        {/* 3. Escola */}
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[3rem] overflow-hidden">
          <CardContent className="p-10">
            <SectionHeader icon={School} title="3. Escola" subtitle="Vínculo Educacional" />
            <div className="grid gap-8 md:grid-cols-2">
              <FormField control={form.control} name="schoolType" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Rede de Ensino *</FormLabel>
                  <Select 
                    onValueChange={(v) => { 
                      field.onChange(v); 
                      if (v === 'none') {
                        form.setValue('schoolName', 'Não estuda no momento');
                      } else {
                        form.setValue('schoolName', ''); 
                      }
                    }} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50/50 border-slate-100">
                        <SelectValue placeholder="Selecione a rede" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="municipal">Municipal</SelectItem>
                      <SelectItem value="state">Estadual</SelectItem>
                      <SelectItem value="private">Particular</SelectItem>
                      <SelectItem value="higher">Ensino Superior</SelectItem>
                      <SelectItem value="none" className="font-bold text-red-500">Não estuda</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <FormField control={form.control} name="schoolName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Unidade Escolar *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!schoolType || schoolType === 'none'}>
                    <FormControl>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50/50 border-slate-100">
                        <SelectValue placeholder={schoolType ? (schoolType === 'none' ? "Não estuda" : "Selecione a escola") : "Selecione a rede primeiro"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {schoolType && SCHOOLS_BY_TYPE[schoolType]?.map(school => (
                        <SelectItem key={school} value={school}>{school}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              {schoolName === "Outra" && (
                <FormField control={form.control} name="schoolOther" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="font-bold">Digite o nome da Instituição *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo da escola ou universidade" {...field} className="h-12 rounded-xl border-primary/30" />
                    </FormControl>
                  </FormItem>
                )} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* 4. Endereço */}
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[3rem] overflow-hidden">
          <CardContent className="p-10">
            <SectionHeader icon={MapPin} title="4. Endereço" subtitle="Local de Residência" />
            <div className="grid gap-8 md:grid-cols-4">
              <FormField control={form.control} name="cep" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">CEP *</FormLabel><FormControl><Input placeholder="00000-000" {...field} className="h-12 rounded-xl bg-slate-50/50 border-slate-100" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="street" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel className="font-bold">Logradouro *</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl bg-slate-50/50 border-slate-100" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="number" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">Número *</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl bg-slate-50/50 border-slate-100" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="neighborhood" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel className="font-bold">Bairro *</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl bg-slate-50/50 border-slate-100" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="complement" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel className="font-bold">Complemento</FormLabel><FormControl><Input placeholder="Apto, Bloco, Casa..." {...field} className="h-12 rounded-xl bg-slate-50/50 border-slate-100" /></FormControl></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4 md:col-span-2">
                <FormItem><FormLabel className="font-bold">Cidade</FormLabel><Input value={form.watch('city')} disabled className="h-12 rounded-xl bg-slate-100" /></FormItem>
                <FormItem><FormLabel className="font-bold">UF</FormLabel><Input value={form.watch('uf')} disabled className="h-12 rounded-xl bg-slate-100" /></FormItem>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5. Saúde */}
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[3rem] overflow-hidden">
          <CardContent className="p-10">
            <SectionHeader icon={HeartPulse} title="5. Saúde" subtitle="Informações Médicas e Cuidados" />
            <div className="grid gap-10 md:grid-cols-2">
              <FormField control={form.control} name="bloodType" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel className="font-bold">Tipo Sanguíneo</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-12 rounded-xl bg-slate-50/50 border-slate-100"><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl><SelectContent>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></FormItem>
              )} />

              {[
                { name: 'hasAllergy', label: 'Possui Alergia?', detail: 'allergyDetail', placeholder: 'Descreva a alergia...' },
                { name: 'hasSpecialNeeds', label: 'Necessidades Especiais?', detail: 'specialNeedsDetail', placeholder: 'Descreva a necessidade...' },
                { name: 'usesMedication', label: 'Usa Medicamento Contínuo?', detail: 'medicationDetail', placeholder: 'Nome e dosagem...' },
                { name: 'hasPhysicalRestriction', label: 'Restrição Física?', detail: 'physicalRestrictionDetail', placeholder: 'Descreva a restrição...' },
                { name: 'practicedActivity', label: 'Já praticou atividade física?', detail: 'practicedActivityDetail', placeholder: 'Qual atividade?' },
              ].map((item) => (
                <div key={item.name} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                  <FormField control={form.control} name={item.name as any} render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-y-0">
                      <FormLabel className="font-bold text-slate-700">{item.label}</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={(v) => field.onChange(v === 'true')} value={field.value ? 'true' : 'false'} className="flex gap-4">
                          <div className="flex items-center space-x-2"><RadioGroupItem value="false" id={`${item.name}-no`} /><label htmlFor={`${item.name}-no`} className="text-sm font-bold">Não</label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="true" id={`${item.name}-yes`} /><label htmlFor={`${item.name}-yes`} className="text-sm font-bold">Sim</label></div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )} />
                  {form.watch(item.name as any) && (
                    <FormField control={form.control} name={item.detail as any} render={({ field }) => (
                      <FormItem><FormControl><Input {...field} placeholder={item.placeholder} className="h-10 rounded-xl bg-white border-slate-200" /></FormControl></FormItem>
                    )} />
                  )}
                </div>
              ))}

              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                <FormField control={form.control} name="familyHeartHistory" render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-y-0">
                    <FormLabel className="font-bold text-slate-700">Histórico Cardíaco na Família?</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={(v) => field.onChange(v === 'true')} value={field.value ? 'true' : 'false'} className="flex gap-4">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="false" id="heart-no" /><label htmlFor="heart-no" className="text-sm font-bold">Não</label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="true" id="heart-yes" /><label htmlFor="heart-yes" className="text-sm font-bold">Sim</label></div>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )} />
              </div>

              <div className="md:col-span-2 space-y-4">
                <FormLabel className="font-bold text-slate-700">Problemas de Saúde Diagnosticados:</FormLabel>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {HEALTH_PROBLEMS.map((problem) => (
                    <FormField key={problem} control={form.control} name="healthProblems" render={({ field }) => (
                      <FormItem className="flex items-center space-x-3 space-y-0 p-3 bg-white rounded-xl border border-slate-100">
                        <FormControl>
                          <Checkbox 
                            checked={field.value?.includes(problem)} 
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              return checked ? field.onChange([...current, problem]) : field.onChange(current.filter(v => v !== problem));
                            }} 
                          />
                        </FormControl>
                        <FormLabel className="text-xs font-bold text-slate-600 cursor-pointer">{problem}</FormLabel>
                      </FormItem>
                    )} />
                  ))}
                </div>
              </div>

              <FormField control={form.control} name="observations" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel className="font-bold">Observações Adicionais</FormLabel><FormControl><Textarea placeholder="Alguma outra informação importante sobre a saúde do aluno?" {...field} className="min-h-[100px] rounded-2xl bg-slate-50/50 border-slate-100" /></FormControl></FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        {/* 6. Imagem */}
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[3rem] overflow-hidden">
          <CardContent className="p-10">
            <div className="flex items-center justify-between mb-8">
              <SectionHeader icon={Camera} title="6. Imagem" subtitle="Autorização de Uso" />
              <Dialog>
                <DialogTrigger asChild><Button variant="outline" size="sm" className="rounded-xl gap-2 font-bold"><Info className="h-4 w-4" /> Ler Termo</Button></DialogTrigger>
                <DialogContent className="rounded-[2rem]"><DialogHeader><DialogTitle className="font-black">Termo de Autorização de Uso de Imagem</DialogTitle></DialogHeader><div className="text-sm text-slate-600 leading-relaxed p-4">Autorizo a EcoBúzios a utilizar, de forma gratuita, a imagem e voz do aluno para fins institucionais, pedagógicos e de divulgação em redes sociais, sites e materiais impressos da instituição.</div></DialogContent>
              </Dialog>
            </div>
            <FormField control={form.control} name="imageAuthorization" render={({ field }) => (
              <FormItem><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="grid md:grid-cols-2 gap-6"><div className={`flex items-center space-x-4 p-6 rounded-[2rem] border-2 transition-all cursor-pointer ${field.value === 'authorized' ? 'bg-emerald-50 border-emerald-500' : 'bg-slate-50 border-transparent'}`}><RadioGroupItem value="authorized" id="img-auth" /><label htmlFor="img-auth" className="text-sm font-black text-emerald-800 cursor-pointer">AUTORIZO o uso de imagem e voz</label></div><div className={`flex items-center space-x-4 p-6 rounded-[2rem] border-2 transition-all cursor-pointer ${field.value === 'not_authorized' ? 'bg-red-50 border-red-500' : 'bg-slate-50 border-transparent'}`}><RadioGroupItem value="not_authorized" id="img-no-auth" /><label htmlFor="img-no-auth" className="text-sm font-black text-red-800 cursor-pointer">NÃO AUTORIZO o uso de imagem e voz</label></div></RadioGroup></FormControl><FormMessage /></FormItem>
            )} />
          </CardContent>
        </Card>

        {/* 7. Documentação */}
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[3rem] overflow-hidden">
          <CardContent className="p-10">
            <SectionHeader icon={FileText} title="7. Documentação" subtitle="Checklist de Entrega" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {DOCUMENTS.map((doc) => (
                <FormField key={doc} control={form.control} name="docsDelivered" render={({ field }) => (
                  <FormItem className="flex items-center space-x-3 space-y-0 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <FormControl>
                      <Checkbox 
                        checked={field.value?.includes(doc)} 
                        onCheckedChange={(checked) => {
                          const current = field.value || [];
                          return checked ? field.onChange([...current, doc]) : field.onChange(current.filter(v => v !== doc));
                        }} 
                      />
                    </FormControl>
                    <FormLabel className="text-xs font-bold text-slate-600 cursor-pointer">{doc}</FormLabel>
                  </FormItem>
                )} />
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="bg-primary/5 p-10 rounded-[3rem] border border-primary/10 text-center space-y-8">
          <div className="flex justify-center"><CheckCircle2 className="h-16 w-16 text-primary animate-bounce" /></div>
          <div className="space-y-2">
            <h4 className="text-2xl font-black text-primary">Tudo pronto?</h4>
            <p className="text-slate-500 font-medium">Revise os dados antes de confirmar a inscrição no sistema.</p>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 pt-4">
            <Button type="button" variant="outline" className="rounded-2xl px-10 h-14 font-bold text-slate-600 border-slate-200 hover:bg-slate-100" onClick={() => navigate(`${base}/alunos`)}>Descartar Alterações</Button>

            <Button type="submit" className="rounded-2xl px-16 h-14 font-black gap-3 shadow-2xl shadow-primary/30 text-lg"><Save className="h-6 w-6" />{initialData ? 'Salvar Alterações' : 'Finalizar Inscrição'}</Button>
          </div>
        </div>
      </form>
    </Form>
  );
};

export default StudentForm;