"use client";

import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  User, ShieldAlert, School, MapPin, HeartPulse, Camera, FileText, 
  CheckCircle2, ArrowLeft, Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { showSuccess } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';

const formSchema = z.object({
  fullName: z.string().min(3, "Nome muito curto"),
  socialName: z.string().optional(),
  preferredName: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  birthDate: z.string().min(1, "Obrigatório"),
  age: z.string().min(1, "Obrigatório"),
  phone: z.string().min(1, "Obrigatório"),
  cellPhone: z.string().min(1, "Obrigatório"),
  gender: z.string().min(1, "Selecione o gênero"),
  genderOther: z.string().optional(),
  race: z.string().min(1, "Selecione a cor/raça"),
  
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

const StudentForm = () => {
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      city: "Armação dos Búzios",
      uf: "RJ",
      healthProblems: [],
      docsDelivered: [],
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    showSuccess("Inscrição realizada com sucesso!");
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
        
        {/* 1. DADOS GERAIS */}
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8">
            <SectionHeader 
              icon={User} 
              title="1. Dados Gerais do Aluno" 
              subtitle="Informações básicas de identificação" 
            />
            <div className="grid gap-6 md:grid-cols-3">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem className="md:col-span-3">
                    <FormLabel className="font-bold text-slate-700">Nome Completo *</FormLabel>
                    <FormControl><Input placeholder="Digite o nome completo" {...field} className="rounded-xl" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="socialName"
                render={({ field }) => (
                  <FormItem className="md:col-span-1">
                    <FormLabel className="font-bold text-slate-700">Nome Social</FormLabel>
                    <FormControl><Input {...field} className="rounded-xl" /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="preferredName"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="font-bold text-slate-700">Como gostaria de ser chamado(a)?</FormLabel>
                    <FormControl><Input {...field} className="rounded-xl" /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">E-mail</FormLabel>
                    <FormControl><Input type="email" {...field} className="rounded-xl" /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">CPF</FormLabel>
                    <FormControl><Input placeholder="000.000.000-00" {...field} className="rounded-xl" /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">RG</FormLabel>
                    <FormControl><Input {...field} className="rounded-xl" /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Data de Nascimento *</FormLabel>
                    <FormControl><Input type="date" {...field} className="rounded-xl" /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Idade *</FormLabel>
                    <FormControl><Input type="number" {...field} className="rounded-xl" /></FormControl>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4 md:col-span-1">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-slate-700">Telefone *</FormLabel>
                      <FormControl><Input placeholder="(22)" {...field} className="rounded-xl" /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cellPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-slate-700">Celular *</FormLabel>
                      <FormControl><Input placeholder="(22)" {...field} className="rounded-xl" /></FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem className="md:col-span-3">
                    <FormLabel className="font-bold text-slate-700">Gênero *</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-6 mt-2">
                        {['Mulher cis', 'Mulher trans', 'Homem cis', 'Homem trans', 'Outro'].map((g) => (
                          <div key={g} className="flex items-center space-x-2">
                            <RadioGroupItem value={g} id={`gender-${g}`} />
                            <label htmlFor={`gender-${g}`} className="text-sm font-medium">{g}</label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    {field.value === 'Outro' && (
                      <Input placeholder="Especifique..." className="mt-2 rounded-xl" onChange={(e) => form.setValue('genderOther', e.target.value)} />
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="race"
                render={({ field }) => (
                  <FormItem className="md:col-span-3">
                    <FormLabel className="font-bold text-slate-700">Cor/Raça *</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-6 mt-2">
                        {['Branca', 'Preta', 'Amarela', 'Parda', 'Indígena'].map((r) => (
                          <div key={r} className="flex items-center space-x-2">
                            <RadioGroupItem value={r} id={`race-${r}`} />
                            <label htmlFor={`race-${r}`} className="text-sm font-medium">{r}</label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* 2. DADOS DO RESPONSÁVEL */}
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8">
            <SectionHeader 
              icon={ShieldAlert} 
              title="2. Dados do Responsável" 
              subtitle="Obrigatório para menores de 18 anos" 
            />
            <div className="grid gap-6 md:grid-cols-3">
              <FormField
                control={form.control}
                name="guardianName"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="font-bold text-slate-700">Nome Completo do Responsável</FormLabel>
                    <FormControl><Input {...field} className="rounded-xl" /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="guardianKinship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Parentesco</FormLabel>
                    <FormControl><Input placeholder="Ex: Pai, Mãe, Avô..." {...field} className="rounded-xl" /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="guardianPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Telefone do Responsável</FormLabel>
                    <FormControl><Input {...field} className="rounded-xl" /></FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* 3. ESCOLA */}
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8">
            <SectionHeader 
              icon={School} 
              title="3. Escola / Instituição de Ensino" 
              subtitle="Vínculo acadêmico atual" 
            />
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="schoolType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Rede de Ensino *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione a rede" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="municipal">Rede Municipal – Armação dos Búzios</SelectItem>
                        <SelectItem value="state">Rede Estadual</SelectItem>
                        <SelectItem value="private">Rede Particular</SelectItem>
                        <SelectItem value="higher">Ensino Superior</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="schoolName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Unidade Escolar *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione a unidade" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {form.watch('schoolType') === 'municipal' && (
                          <>
                            <SelectItem value="Paulo Freire">Colégio Municipal Paulo Freire</SelectItem>
                            <SelectItem value="José Bento">Escola Municipal José Bento Ribeiro Dantas</SelectItem>
                            <SelectItem value="Regina Silveira">Escola Municipal Profª Regina Silveira Ramos Vieira</SelectItem>
                            <SelectItem value="Cileia Maria">Escola Municipal Profª Cileia Maria Barreto</SelectItem>
                            <SelectItem value="João Guelo">Escola Municipal João José de Carvalho (João Guelo)</SelectItem>
                            <SelectItem value="Manoel Antônio">Escola Municipal Manoel Antônio da Costa</SelectItem>
                            <SelectItem value="Nicomedes">Escola Municipal Nicomedes Theotônio Vieira</SelectItem>
                            <SelectItem value="INEFI">INEFI – Instituto Educacional</SelectItem>
                            <SelectItem value="Eulina Assis">Escola Estadual Municipalizada Profª Eulina de Assis Marques</SelectItem>
                            <SelectItem value="Maria Amélia">Creche Escola Maria Amélia Oliveira de Souza</SelectItem>
                            <SelectItem value="outra_municipal">Outra unidade municipal</SelectItem>
                          </>
                        )}
                        {form.watch('schoolType') === 'state' && (
                          <>
                            <SelectItem value="João Botas">C.E. João de Oliveira Botas</SelectItem>
                            <SelectItem value="outra_estadual">Outra escola estadual</SelectItem>
                          </>
                        )}
                        {form.watch('schoolType') === 'private' && (
                          <>
                            <SelectItem value="Santa Rosa">Instituto Santa Rosa</SelectItem>
                            <SelectItem value="Dominus">Instituto Dominus de Educação</SelectItem>
                            <SelectItem value="Futuro">Colégio Futuro</SelectItem>
                            <SelectItem value="Santos Filho">Centro Educacional Santos Filho</SelectItem>
                            <SelectItem value="outra_particular">Outra escola particular</SelectItem>
                          </>
                        )}
                        {form.watch('schoolType') === 'higher' && (
                          <SelectItem value="universidade">Universidade / Faculdade</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {(form.watch('schoolName')?.includes('outra') || form.watch('schoolName') === 'universidade') && (
                <FormField
                  control={form.control}
                  name="schoolOther"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="font-bold text-slate-700">Qual unidade?</FormLabel>
                      <FormControl><Input {...field} className="rounded-xl" /></FormControl>
                    </FormItem>
                  )}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* 4. ENDEREÇO */}
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8">
            <SectionHeader 
              icon={MapPin} 
              title="4. Endereço" 
              subtitle="Local de residência" 
            />
            <div className="grid gap-6 md:grid-cols-4">
              <FormField
                control={form.control}
                name="cep"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">CEP</FormLabel>
                    <FormControl><Input placeholder="00000-000" {...field} className="rounded-xl" /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="street"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="font-bold text-slate-700">Logradouro</FormLabel>
                    <FormControl><Input {...field} className="rounded-xl" /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Número</FormLabel>
                    <FormControl><Input {...field} className="rounded-xl" /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="complement"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="font-bold text-slate-700">Complemento</FormLabel>
                    <FormControl><Input {...field} className="rounded-xl" /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="neighborhood"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Bairro</FormLabel>
                    <FormControl><Input {...field} className="rounded-xl" /></FormControl>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormItem>
                  <FormLabel className="font-bold text-slate-700">Cidade</FormLabel>
                  <Input value="Armação dos Búzios" disabled className="rounded-xl bg-slate-50" />
                </FormItem>
                <FormItem>
                  <FormLabel className="font-bold text-slate-700">UF</FormLabel>
                  <Input value="RJ" disabled className="rounded-xl bg-slate-50" />
                </FormItem>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5. SAÚDE */}
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8">
            <SectionHeader 
              icon={HeartPulse} 
              title="5. Informações de Saúde" 
              subtitle="Dados médicos e restrições" 
            />
            <div className="grid gap-8 md:grid-cols-2">
              <FormField
                control={form.control}
                name="bloodType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Tipo Sanguíneo</FormLabel>
                    <FormControl><Input placeholder="Ex: A+, O-..." {...field} className="rounded-xl" /></FormControl>
                  </FormItem>
                )}
              />

              {[
                { name: 'hasAllergy', label: 'Tem alergia?', detail: 'allergyDetail', detailLabel: 'Qual?' },
                { name: 'hasSpecialNeeds', label: 'Portador(a) de necessidades especiais?', detail: 'specialNeedsDetail', detailLabel: 'Qual?' },
                { name: 'usesMedication', label: 'Uso de medicamento contínuo?', detail: 'medicationDetail', detailLabel: 'Qual?' },
                { name: 'hasPhysicalRestriction', label: 'Restrição à prática de atividade física?', detail: 'physicalRestrictionDetail', detailLabel: 'Qual?' },
                { name: 'practicedActivity', label: 'Já praticou atividade física?', detail: 'practicedActivityDetail', detailLabel: 'Qual?' },
              ].map((item) => (
                <div key={item.name} className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <FormField
                    control={form.control}
                    name={item.name as any}
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between space-y-0">
                        <FormLabel className="font-bold text-slate-700">{item.label}</FormLabel>
                        <FormControl>
                          <RadioGroup 
                            onValueChange={(v) => field.onChange(v === 'true')} 
                            className="flex gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="false" id={`${item.name}-no`} />
                              <label htmlFor={`${item.name}-no`} className="text-sm">Não</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="true" id={`${item.name}-yes`} />
                              <label htmlFor={`${item.name}-yes`} className="text-sm">Sim</label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  {form.watch(item.name as any) && (
                    <FormField
                      control={form.control}
                      name={item.detail as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold text-primary">{item.detailLabel}</FormLabel>
                          <FormControl><Input {...field} className="rounded-xl bg-white" /></FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              ))}

              <FormField
                control={form.control}
                name="familyHeartHistory"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <FormLabel className="font-bold text-slate-700">Histórico de doença cardíaca na família?</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={(v) => field.onChange(v === 'true')} className="flex gap-4">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="false" id="heart-no" /><label htmlFor="heart-no" className="text-sm">Não</label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="true" id="heart-yes" /><label htmlFor="heart-yes" className="text-sm">Sim</label></div>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="md:col-span-2 space-y-4">
                <FormLabel className="font-bold text-slate-700">Problemas de saúde:</FormLabel>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {['Dores articulares', 'Diabetes', 'Hipertensão', 'Doenças respiratórias', 'Osteoporose', 'Doença cardiovascular'].map((p) => (
                    <FormField
                      key={p}
                      control={form.control}
                      name="healthProblems"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(p)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...field.value, p])
                                  : field.onChange(field.value?.filter((value) => value !== p))
                              }}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-medium leading-none">{p}</FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <FormField
                  control={form.control}
                  name="healthProblemsOther"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-slate-500">Outras condições:</FormLabel>
                      <FormControl><Input {...field} className="rounded-xl" /></FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="observations"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="font-bold text-slate-700">Observações Adicionais</FormLabel>
                    <FormControl><Textarea {...field} className="rounded-2xl min-h-[100px]" /></FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* 6. AUTORIZAÇÃO DE IMAGEM */}
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8">
            <SectionHeader 
              icon={Camera} 
              title="6. Autorização de Uso de Imagem" 
              subtitle="Termo de consentimento institucional" 
            />
            <FormField
              control={form.control}
              name="imageAuthorization"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col gap-4">
                      <div className="flex items-center space-x-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <RadioGroupItem value="authorized" id="img-auth" />
                        <label htmlFor="img-auth" className="text-sm font-bold text-emerald-800">
                          Autorizo o uso de imagem para fins institucionais e divulgação do projeto.
                        </label>
                      </div>
                      <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <RadioGroupItem value="not_authorized" id="img-no-auth" />
                        <label htmlFor="img-no-auth" className="text-sm font-bold text-slate-600">
                          Não autorizo o uso de imagem.
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* 7. DOCUMENTOS ENTREGUES */}
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8">
            <SectionHeader 
              icon={FileText} 
              title="7. Documentos Entregues" 
              subtitle="Checklist de documentação física" 
            />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {['Foto 3x4', 'Declaração Escolar', 'Autorização do Responsável', 'CPF', 'RG', 'Atestado Médico'].map((doc) => (
                <FormField
                  key={doc}
                  control={form.control}
                  name="docsDelivered"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(doc)}
                          onCheckedChange={(checked) => {
                            return checked
                              ? field.onChange([...field.value, doc])
                              : field.onChange(field.value?.filter((value) => value !== doc))
                          }}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-bold text-slate-700">{doc}</FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* DECLARAÇÃO FINAL */}
        <div className="bg-primary/5 p-8 rounded-[2.5rem] border border-primary/10 text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle2 className="h-12 w-12 text-primary" />
          </div>
          <div className="space-y-2">
            <h4 className="text-xl font-black text-primary">Declaração de Veracidade</h4>
            <p className="text-slate-600 font-medium max-w-2xl mx-auto">
              Declaro que todas as informações acima prestadas são verdadeiras e assumo total responsabilidade pela exatidão dos dados fornecidos.
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              className="rounded-2xl px-8 h-12 font-bold gap-2"
              onClick={() => navigate('/alunos')}
            >
              <ArrowLeft className="h-4 w-4" />
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="rounded-2xl px-12 h-12 font-black gap-2 shadow-xl shadow-primary/20"
            >
              <Save className="h-4 w-4" />
              Finalizar Inscrição
            </Button>
          </div>
        </div>

      </form>
    </Form>
  );
};

export default StudentForm;