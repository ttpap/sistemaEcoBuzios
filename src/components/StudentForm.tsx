"use client";

import React, { useEffect, useRef, useState } from 'react';
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
import { showSuccess, showError } from '@/utils/toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAreaBaseFromPathname } from '@/utils/route-base';
import { useAuth } from "@/context/AuthContext";

import { differenceInYears, parseISO } from 'date-fns';
import { StudentRegistration } from '@/types/student';
import { readGlobalStudents, writeGlobalStudents } from '@/utils/storage';
import { DEFAULT_STUDENT_PASSWORD, getStudentLoginFromRegistration, getStudentSessionStudentId } from '@/utils/student-auth';
import { allocateNewStudentRegistration } from '@/utils/student-registration';
import { lookupCep } from '@/utils/cep';
import { studentsService } from "@/services/studentsService";
import { supabase } from "@/integrations/supabase/client";

import { getTeacherSessionLogin, getTeacherSessionPassword } from "@/utils/teacher-auth";
import { getCoordinatorSessionLogin, getCoordinatorSessionPassword } from "@/utils/coordinator-auth";
import { getActiveProjectId } from "@/utils/projects";

function getModeBStaffCreds(): { login: string; password: string } | null {
  const tLogin = getTeacherSessionLogin();
  const tPw = getTeacherSessionPassword();
  if (tLogin && tPw) return { login: tLogin, password: tPw };

  const cLogin = getCoordinatorSessionLogin();
  const cPw = getCoordinatorSessionPassword();
  if (cLogin && cPw) return { login: cLogin, password: cPw };

  return null;
}

function makeId() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = typeof crypto !== "undefined" ? crypto : null;
  return c?.randomUUID ? c.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeUuid() {
  const c = (globalThis as any).crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();

  // Sem crypto/getRandomValues (contexto não-seguro/ambiente limitado): gera UUID v4 válido usando Math.random.
  // É suficiente para satisfazer o tipo uuid do Postgres (e evita inserts falharem por formato inválido).
  if (!c?.getRandomValues) {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
      const r = Math.floor(Math.random() * 16);
      const v = ch === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // Fallback using getRandomValues (RFC4122 v4)
  const bytes = new Uint8Array(16);
  c.getRandomValues(bytes);

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isUniqueViolation(e: any) {
  const code = String(e?.code || "");
  const msg = String(e?.message || "").toLowerCase();
  return code === "23505" || msg.includes("duplicate") || msg.includes("unique");
}

function makeRandomRegistration(year: string, used: Set<string>) {
  for (let i = 0; i < 50; i++) {
    const suffix = String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0");
    const reg = `${year}-${suffix}`;
    if (!used.has(reg)) {
      used.add(reg);
      return reg;
    }
  }
  // fallback extremo: deixa repetir (a política de unique vai forçar retry no insert)
  const suffix = String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0");
  return `${year}-${suffix}`;
}

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
  "Certidão de Nascimento",
  "Comprovante de Residência",
  "Declaração Escolar",
  "Atestado Médico",
  "CPF do Aluno",
  "CPF do Responsável",
];

const schema = z.object({
  // 1. Dados pessoais
  fullName: z.string().min(1, "Obrigatório"),
  socialName: z.string().optional(),
  preferredName: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  cpf: z.string().optional(),
  birthDate: z.string().min(1, "Obrigatório"),
  age: z.coerce.number().min(0),
  cellPhone: z.string().min(1, "Obrigatório"),
  gender: z.string().min(1, "Obrigatório"),
  race: z.string().min(1, "Obrigatório"),
  photo: z.string().min(1, "Foto obrigatória"),

  // 2. Responsável
  guardianName: z.string().optional(),
  guardianKinship: z.string().optional(),
  guardianPhone: z.string().optional(),

  guardianDeclarationConfirmed: z
    .boolean()
    .refine((v) => v === true, { message: "Você precisa confirmar a declaração do responsável." }),

  // 3. Escola
  schoolType: z.string().min(1, "Obrigatório"),
  schoolName: z.string().default(""),
  schoolOther: z.string().optional(),

  // 4. Endereço
  cep: z.string().min(1, "Obrigatório"),
  street: z.string().min(1, "Obrigatório"),
  number: z.string().min(1, "Obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, "Obrigatório"),
  city: z.string().min(1, "Obrigatório"),
  uf: z.string().min(1, "Obrigatório"),

  // Utilidades
  enelClientNumber: z.string().optional(),

  // 5. Saúde
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
  familyHeartHistoryDetail: z.string().optional(),
  healthProblems: z.array(z.string()).default([]),
  healthProblemsOther: z.string().optional(),
  observations: z.string().optional(),

  // 6. Imagem
  imageAuthorization: z.string().min(1, "Obrigatório"),

  // 7. Documentos
  docsDelivered: z.array(z.string()).default([]),
}).superRefine((data, ctx) => {
  if (data.schoolType !== 'none' && (!data.schoolName || data.schoolName.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Obrigatório",
      path: ["schoolName"],
    });
  }
});

interface StudentFormProps {
  initialData?: StudentRegistration | null;
  redirectTo?: string | null;
  hideDiscard?: boolean;
  submitLabel?: string;
  onCompleted?: (result: { registration: string; login: string; password: string }) => void;
  hideDocumentation?: boolean;
}

const StudentForm = ({ 
  initialData, 
  redirectTo, 
  hideDiscard, 
  submitLabel, 
  onCompleted, 
  hideDocumentation 
}: StudentFormProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const base = getAreaBaseFromPathname(location.pathname);
  const { session, profile } = useAuth();
  const isAdmin = Boolean(session && profile?.role === "admin");

  const [photoPreview, setPhotoPreview] = useState<string | null>(initialData?.photo || null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: initialData?.fullName || "",
      socialName: initialData?.socialName || "",
      preferredName: initialData?.preferredName || "",
      email: initialData?.email || "",
      cpf: initialData?.cpf || "",
      birthDate: initialData?.birthDate || "",
      age: initialData?.age || 0,
      cellPhone: initialData?.cellPhone || "",
      gender: initialData?.gender || "",
      race: initialData?.race || "",
      photo: initialData?.photo || "",

      guardianName: initialData?.guardianName || "",
      guardianKinship: initialData?.guardianKinship || "",
      guardianPhone: initialData?.guardianPhone || "",
      guardianDeclarationConfirmed: Boolean((initialData as any)?.guardianDeclarationConfirmed),

      schoolType: initialData?.schoolType || "",
      schoolName: initialData?.schoolName || "",
      schoolOther: initialData?.schoolOther || "",
      
      cep: initialData?.cep || "",
      street: initialData?.street || "",
      number: initialData?.number || "",
      complement: initialData?.complement || "",
      neighborhood: initialData?.neighborhood || "",
      city: initialData?.city || "",
      uf: initialData?.uf || "",
      
      enelClientNumber: initialData?.enelClientNumber || "",
      
      bloodType: initialData?.bloodType || "",
      hasAllergy: initialData?.hasAllergy || false,
      allergyDetail: initialData?.allergyDetail || "",
      hasSpecialNeeds: initialData?.hasSpecialNeeds || false,
      specialNeedsDetail: initialData?.specialNeedsDetail || "",
      usesMedication: initialData?.usesMedication || false,
      medicationDetail: initialData?.medicationDetail || "",
      hasPhysicalRestriction: initialData?.hasPhysicalRestriction || false,
      physicalRestrictionDetail: initialData?.physicalRestrictionDetail || "",
      practicedActivity: initialData?.practicedActivity || false,
      practicedActivityDetail: initialData?.practicedActivityDetail || "",
      familyHeartHistory: initialData?.familyHeartHistory || false,
      familyHeartHistoryDetail: initialData?.familyHeartHistoryDetail || "",
      healthProblems: initialData?.healthProblems || [],
      healthProblemsOther: initialData?.healthProblemsOther || "",
      observations: initialData?.observations || "",
      
      imageAuthorization: initialData?.imageAuthorization || "authorized",
      docsDelivered: initialData?.docsDelivered || [],
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
    let cancelled = false;

    const run = async () => {
      const res = await lookupCep(cep || "");
      if (cancelled || !res) return;

      form.setValue('street', res.street || "", { shouldDirty: true, shouldValidate: true });
      form.setValue('neighborhood', res.neighborhood || "", { shouldDirty: true, shouldValidate: true });
      form.setValue('city', res.city || "Armação dos Búzios", { shouldDirty: true, shouldValidate: true });
      form.setValue('uf', res.uf || "RJ", { shouldDirty: true, shouldValidate: true });
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [cep, form]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { imageFileToCompressedDataUrl } = await import("@/utils/image-compress");
      const dataUrl = await imageFileToCompressedDataUrl(file, {
        maxSide: 1024,
        quality: 0.82,
        outputType: "image/jpeg",
      });
      setPhotoPreview(dataUrl);
      form.setValue("photo", dataUrl);
    } catch (e: any) {
      // Fallback: se algo der errado, avisa o usuário.
      const msg = String(e?.message || "");
      const maybeHeic = (file.type || "").toLowerCase().includes("heic") || (file.name || "").toLowerCase().endsWith(".heic");
      if (maybeHeic) {
        showError(
          "Não consegui converter essa foto do iPhone (HEIC). Tente no iPhone: Ajustes → Câmera → Formatos → Mais compatível, e envie novamente.",
        );
        return;
      }

      showError("Não foi possível processar a imagem. Tente outra foto.");
    }
  };

  async function onSubmit(values: z.infer<typeof schema>) {
    console.info("[StudentForm] onSubmit_enter", {
      initialData: Boolean(initialData),
      hasSession: Boolean(session),
      role: profile?.role || null,
    });

    const existingStudents = readGlobalStudents<StudentRegistration[]>([]);

    const finalSchoolName = values.schoolName === "Outra" ? values.schoolOther : values.schoolName;

    const studentData = {
      ...values,
      enelClientNumber: (values.enelClientNumber || "").replace(/\D/g, "").trim() || undefined,
      schoolName: finalSchoolName || values.schoolName,
    };

    const persistToSupabase = async (input: { id: string; registration: string; status?: string; class?: string }) => {
      console.info("[StudentForm] persistToSupabase_enter", { initialData: Boolean(initialData) });

      const row = {
        id: input.id,
        registration: input.registration,

        full_name: values.fullName.trim(),
        // OBS: a tabela public.students não possui coluna preferred_name.
        // Mantemos a informação usando social_name (prioriza preferredName se preenchido).
        social_name: values.preferredName || values.socialName || null,
        email: values.email || null,
        cpf: (values.cpf || "").replace(/\D/g, "").trim() || null,
        birth_date: values.birthDate,
        age: values.age,
        cell_phone: values.cellPhone,
        gender: values.gender,
        race: values.race,
        photo: photoPreview || null,

        guardian_name: values.guardianName || null,
        guardian_kinship: values.guardianKinship || null,
        guardian_phone: values.guardianPhone || null,
        guardian_declaration_confirmed: values.guardianDeclarationConfirmed,

        school_type: values.schoolType || null,
        school_name: finalSchoolName || values.schoolName,
        school_other: values.schoolName === "Outra" ? (values.schoolOther || null) : null,

        cep: values.cep,
        street: values.street,
        number: values.number,
        complement: values.complement || null,
        neighborhood: values.neighborhood,
        city: values.city,
        uf: values.uf,

        enel_client_number: (values.enelClientNumber || "").replace(/\D/g, "").trim() || null,

        blood_type: values.bloodType || null,
        has_allergy: values.hasAllergy,
        allergy_detail: values.allergyDetail || null,
        has_special_needs: values.hasSpecialNeeds,
        special_needs_detail: values.specialNeedsDetail || null,
        uses_medication: values.usesMedication,
        medication_detail: values.medicationDetail || null,
        has_physical_restriction: values.hasPhysicalRestriction,
        physical_restriction_detail: values.physicalRestrictionDetail || null,
        practiced_activity: values.practicedActivity,
        practiced_activity_detail: values.practicedActivityDetail || null,
        family_heart_history: values.familyHeartHistory,
        family_heart_history_detail: values.familyHeartHistoryDetail || null,
        health_problems: values.healthProblems || [],
        health_problems_other: values.healthProblemsOther || null,
        observations: values.observations || null,

        image_authorization: values.imageAuthorization,
        docs_delivered: values.docsDelivered || [],

        // defaults (evita erro de NOT NULL em inserts)
        status: (input.status || "Ativo") as any,
        class: (input.class || "A definir") as any,
      };

      const creds = getModeBStaffCreds();
      const projectId = getActiveProjectId();

      console.info("[StudentForm] persistToSupabase_path", {
        isAdmin,
        hasSession: Boolean(session),
        role: profile?.role || null,
        initialData: Boolean(initialData),
        hasModeBCreds: Boolean(creds),
        projectId,
      });

      // 0) Aluno editando os próprios dados (Mode B student self-update)
      const selfStudentId = getStudentSessionStudentId();
      if (selfStudentId && initialData && String(initialData.id) === selfStudentId) {
        console.info("[StudentForm] path=student_self_update");
        const { error: selfErr } = await supabase.rpc("mode_b_student_self_update", {
          p_student_id: selfStudentId,
          p_full_name: row.full_name,
          p_social_name: row.social_name ?? null,
          p_email: row.email ?? null,
          p_cpf: row.cpf ?? null,
          p_birth_date: row.birth_date,
          p_age: row.age,
          p_cell_phone: row.cell_phone,
          p_gender: row.gender,
          p_race: row.race,
          p_photo: row.photo ?? null,
          p_guardian_name: row.guardian_name ?? null,
          p_guardian_kinship: row.guardian_kinship ?? null,
          p_guardian_phone: row.guardian_phone ?? null,
          p_guardian_declaration_confirmed: row.guardian_declaration_confirmed,
          p_school_type: row.school_type ?? null,
          p_school_name: row.school_name,
          p_school_other: row.school_other ?? null,
          p_cep: row.cep,
          p_street: row.street,
          p_number: row.number,
          p_complement: row.complement ?? null,
          p_neighborhood: row.neighborhood,
          p_city: row.city,
          p_uf: row.uf,
          p_blood_type: row.blood_type ?? null,
          p_has_allergy: row.has_allergy,
          p_allergy_detail: row.allergy_detail ?? null,
          p_has_special_needs: row.has_special_needs,
          p_special_needs_detail: row.special_needs_detail ?? null,
          p_uses_medication: row.uses_medication,
          p_medication_detail: row.medication_detail ?? null,
          p_has_physical_restriction: row.has_physical_restriction,
          p_physical_restriction_detail: row.physical_restriction_detail ?? null,
          p_practiced_activity: row.practiced_activity,
          p_practiced_activity_detail: row.practiced_activity_detail ?? null,
          p_family_heart_history: row.family_heart_history,
          p_family_heart_history_detail: row.family_heart_history_detail ?? null,
          p_health_problems: row.health_problems ?? [],
          p_health_problems_other: row.health_problems_other ?? null,
          p_observations: row.observations ?? null,
          p_image_authorization: row.image_authorization,
          p_enel_client_number: row.enel_client_number ?? null,
        });
        if (selfErr) throw new Error(selfErr.message || "Não foi possível salvar seus dados.");
        return;
      }

      // 1) Sessão Supabase Auth: só pode ir direto para a tabela students quando for ADMIN.
      if (isAdmin) {
        console.info("[StudentForm] path=admin_direct", { op: initialData ? "update" : "insert" });
        if (initialData) {
          if (!isUuid(String(initialData.id || ""))) {
            throw new Error("ID do aluno inválido. Não foi possível salvar.");
          }
          await studentsService.updateById({ id: String(initialData.id), row });
          return;
        }

        await studentsService.insert(row);
        return;
      }

      // 2) Não-admin (ou sem sessão)
      if (initialData) {
        console.info("[StudentForm] path=modeB_edit_rpc");
        if (!projectId) throw new Error("Nenhum projeto ativo. Selecione um projeto e tente novamente.");
        if (!creds) {
          throw new Error(
            "Sua sessão do Professor/Coordenador expirou. Faça login novamente (Modo B) e tente salvar de novo.",
          );
        }

        await studentsService.modeBUpsert({
          login: creds.login,
          password: creds.password,
          projectId,
          row,
        });
        return;
      }

      if (creds && projectId) {
        console.info("[StudentForm] path=modeB_new_rpc");
        try {
          await studentsService.modeBUpsert({
            login: creds.login,
            password: creds.password,
            projectId,
            row,
          });
          return;
        } catch (e) {
          console.warn("[StudentForm] modeB_upsert_failed_fallback_to_anon", e);
        }
      }

      console.info("[StudentForm] path=public_anon_insert");
      await studentsService.insertAsAnon(row);
    };

    const run = async () => {
      if (initialData) {
        try {
          await persistToSupabase({
            id: String(initialData.id),
            registration: String((initialData as any).registration || ""),
          });
        } catch (e: any) {
          showError(e?.message || "Não foi possível salvar no Supabase.");
          return;
        }

        const updated = existingStudents.map((s: any) =>
          s.id === initialData.id ? { ...s, ...studentData, guardianDeclarationConfirmed: values.guardianDeclarationConfirmed } : s
        );
        writeGlobalStudents(updated);

        showSuccess("Dados atualizados!");

        const reg = String((initialData as any).registration || "");
        if (reg) {
          onCompleted?.({
            registration: reg,
            login: getStudentLoginFromRegistration(reg),
            password: DEFAULT_STUDENT_PASSWORD,
          });
        }
      } else {
        const used = new Set<string>();
        for (const s of existingStudents) {
          const r = String((s as any).registration || "");
          if (/^\d{4}-\d{4}$/.test(r)) used.add(r);
        }

        let registration: string | null = null;
        let createdId = makeUuid();
        let persisted = false;
        let lastError: any = null;

        const maxAttempts = 200;
        const year = String(new Date().getFullYear());

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          registration = makeRandomRegistration(year, used);
          createdId = makeUuid();

          try {
            await persistToSupabase({
              id: createdId,
              registration,
              status: "Ativo",
              class: "A definir",
            });
            persisted = true;
            break;
          } catch (e: any) {
            lastError = e;

            if (isUniqueViolation(e)) {
              // tenta outra matrícula
              continue;
            }

            showError(e?.message || "Não foi possível salvar no Supabase.");
            return;
          }
        }

        if (!persisted || !registration) {
          showError(
            lastError?.message ||
              "Não foi possível concluir o cadastro: a matrícula colidiu com registros existentes. Tente novamente.",
          );
          return;
        }

        const created: any = {
          ...studentData,
          id: createdId,
          registrationDate: new Date().toISOString(),
          registration: registration,
          status: 'Ativo',
          class: 'A definir',
          guardianDeclarationConfirmed: values.guardianDeclarationConfirmed
        };
        writeGlobalStudents([...existingStudents, created]);

        showSuccess("Inscrição realizada!");
        onCompleted?.({
          registration,
          login: getStudentLoginFromRegistration(registration),
          password: DEFAULT_STUDENT_PASSWORD,
        });
      }

      const target = redirectTo === undefined ? `${base}/alunos` : redirectTo;
      if (target !== null) navigate(target);
    };

    void run();
  }

  const onInvalid = (errors: any) => {
    // Log temporário detalhado: mostra qual campo está inválido e a mensagem completa.
    const entries = Object.entries(errors || {});
    const first = entries[0] as any;
    const firstField = first?.[0] ? String(first[0]) : null;
    const firstErr = first?.[1] as any;
    const firstMsg = firstErr?.message ? String(firstErr.message) : null;

    console.warn("[StudentForm] onSubmit_invalid", {
      firstField,
      firstMsg,
      errors,
      valuesSnapshot: form.getValues(),
    });

    showError(firstMsg ? `${firstField}: ${firstMsg}` : "Existem campos obrigatórios inválidos. Verifique o formulário.");
  };

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
      <form
        noValidate
        onSubmitCapture={() => console.info("[StudentForm] form_submit_capture")}
        onClickCapture={(e) => {
          const t = e.target as HTMLElement | null;
          const label = t?.tagName ? `${t.tagName.toLowerCase()}${t.getAttribute("type") ? `[type=${t.getAttribute("type")}]` : ""}` : "unknown";
          console.info("[StudentForm] form_click_capture", label);
        }}
        onSubmit={form.handleSubmit(
          (vals) => {
            console.info("[StudentForm] handleSubmit_valid");
            return onSubmit(vals);
          },
          onInvalid,
        )}
        className="space-y-10 max-w-5xl mx-auto pb-24"
      >
        
        <div className="flex flex-col items-center justify-center mb-12">
          <div className="relative group">
            <div
              className={`w-40 h-40 rounded-[3rem] border-4 shadow-2xl overflow-hidden flex items-center justify-center cursor-pointer ${form.formState.errors.photo ? "border-rose-400 bg-rose-50" : "border-white bg-slate-100"}`}
              onClick={() => photoInputRef.current?.click()}
              title="Clique para adicionar foto"
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <User className={`h-16 w-16 ${form.formState.errors.photo ? "text-rose-300" : "text-slate-300"}`} />
              )}
            </div>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="absolute bottom-2 right-2 bg-primary text-white p-3 rounded-2xl cursor-pointer shadow-xl hover:scale-110 transition-transform"
            >
              <Camera className="h-5 w-5" />
            </button>
            <input ref={photoInputRef} type="file" className="sr-only" accept="image/*" onChange={handlePhotoUpload} />
          </div>
          <p className="text-xs font-black text-slate-400 mt-4 uppercase tracking-widest">Foto Oficial do Aluno <span className="text-rose-500">*</span></p>
          {form.formState.errors.photo && (
            <p className="mt-1 text-xs font-bold text-rose-500">{form.formState.errors.photo.message}</p>
          )}
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
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">E-mail (aluno)</FormLabel><FormControl><Input type="email" {...field} className="h-12 rounded-xl bg-slate-50/50 border-slate-100" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="cpf" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">CPF (aluno)</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} className="h-12 rounded-xl bg-slate-50/50 border-slate-100" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="birthDate" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">Data de Nascimento *</FormLabel><FormControl><Input type="date" {...field} className="h-12 rounded-xl bg-slate-50/50 border-slate-100" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="age" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">Idade</FormLabel><FormControl><Input type="number" {...field} disabled className="h-12 rounded-xl bg-slate-100 font-black text-primary" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="cellPhone" render={({ field }) => (
                <FormItem className="md:col-span-3"><FormLabel className="font-bold">Celular / WhatsApp (aluno) *</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl bg-slate-50/50 border-slate-100" /></FormControl></FormItem>
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
        <section className="rounded-[2.5rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden">
          <CardContent className="p-10">
            <SectionHeader icon={ShieldAlert} title="2. Responsável" subtitle="Dados do Tutor Legal" />
            <div className="p-8 pt-0 grid gap-4 md:grid-cols-2">
              <FormField control={form.control} name="guardianName" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel className="font-bold">Nome Completo do Responsável</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl bg-slate-50/50 border-slate-100" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="guardianKinship" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">Grau de Parentesco</FormLabel><FormControl><Input placeholder="Ex: Mãe, Pai, Avó..." {...field} className="h-12 rounded-xl bg-slate-50/50 border-slate-100" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="guardianPhone" render={({ field }) => (
                <FormItem><FormLabel className="font-bold">Celular / WhatsApp (responsável)</FormLabel><FormControl><Input {...field} className="h-12 rounded-xl bg-slate-50/50 border-slate-100" /></FormControl></FormItem>
              )} />

              <div className="md:col-span-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Declaração do responsável
                </p>
                <p className="mt-2 text-sm font-bold text-slate-700">
                  Declaro que sou responsável legal pelo(a) aluno(a) e confirmo que as informações fornecidas nesta ficha
                  são verdadeiras.
                </p>

                <FormField
                  control={form.control}
                  name="guardianDeclarationConfirmed"
                  render={({ field }) => (
                    <FormItem className="mt-4 flex flex-row items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(Boolean(v))} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-black">Confirmo a declaração do responsável</FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </section>

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
                <FormItem>
                  <FormLabel className="font-bold">Cidade</FormLabel>
                  <Input value={form.watch('city')} disabled className="h-12 rounded-xl bg-slate-100" />
                </FormItem>
                <FormItem>
                  <FormLabel className="font-bold">UF</FormLabel>
                  <Input value={form.watch('uf')} disabled className="h-12 rounded-xl bg-slate-100" />
                </FormItem>
              </div>

              {/* Campos hidden para garantir que city/uf existam no submit (Zod exige) */}
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <input type="hidden" {...field} value={form.watch("city") || ""} />
                )}
              />
              <FormField
                control={form.control}
                name="uf"
                render={({ field }) => (
                  <input type="hidden" {...field} value={form.watch("uf") || ""} />
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* 5. Utilidades */}
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[3rem] overflow-hidden">
          <CardContent className="p-10">
            <SectionHeader icon={Info} title="5. Utilidades" subtitle="Informações de referência" />
            <div className="grid gap-8 md:grid-cols-3">
              <FormField control={form.control} name="enelClientNumber" render={({ field }) => (
                <FormItem className="md:col-span-1">
                  <FormLabel className="font-bold">Nº Cliente ENEL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Somente números"
                      inputMode="numeric"
                      autoComplete="off"
                      {...field}
                      className="h-12 rounded-xl bg-slate-50/50 border-slate-100"
                    />
                  </FormControl>
                </FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        {/* 6. Saúde */}
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[3rem] overflow-hidden">
          <CardContent className="p-10">
            <SectionHeader icon={HeartPulse} title="6. Saúde" subtitle="Informações Médicas e Cuidados" />
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

              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
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
                {form.watch('familyHeartHistory') && (
                  <FormField control={form.control} name="familyHeartHistoryDetail" render={({ field }) => (
                    <FormItem><FormControl><Input {...field} placeholder="Descreva o histórico cardíaco familiar..." className="h-10 rounded-xl bg-white border-slate-200" /></FormControl></FormItem>
                  )} />
                )}
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

        {/* 7. Imagem */}
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[3rem] overflow-hidden">
          <CardContent className="p-10">
            <div className="flex items-center justify-between mb-8">
              <SectionHeader icon={Camera} title="7. Imagem" subtitle="Autorização de Uso" />
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

        {!hideDocumentation && (
          <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[3rem] overflow-hidden">
            <CardContent className="p-10">
              <SectionHeader icon={FileText} title="8. Documentação" subtitle="Checklist de Entrega" />
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
        )}

        <div className="bg-primary/5 p-10 rounded-[3rem] border border-primary/10 text-center space-y-8">
          <div className="flex justify-center"><CheckCircle2 className="h-16 w-16 text-primary animate-bounce" /></div>
          <div className="space-y-2">
            <h4 className="text-2xl font-black text-primary">Tudo pronto?</h4>
            <p className="text-slate-500 font-medium">Revise os dados antes de confirmar a inscrição no sistema.</p>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 pt-4">
            {!hideDiscard && (
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl px-10 h-14 font-bold text-slate-600 border-slate-200 hover:bg-slate-100"
                onClick={() => navigate(`${base}/alunos`) }
              >
                Descartar Alterações
              </Button>
            )}

            <Button
              type="submit"
              onMouseDown={() => console.info("[StudentForm] submit_button_mousedown")}
              onClick={() => console.info("[StudentForm] submit_button_click")}
              className="rounded-2xl px-16 h-14 font-black gap-3 shadow-2xl shadow-primary/30 text-lg"
            >
              <Save className="h-6 w-6" />
              {submitLabel || (initialData ? 'Salvar Alterações' : 'Finalizar Inscrição')}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
};

export default StudentForm;