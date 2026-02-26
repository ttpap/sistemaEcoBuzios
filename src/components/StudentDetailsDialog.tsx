"use client";

import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "lucide-react";
import { StudentRegistration } from "@/types/student";
import { SchoolClass } from "@/types/class";
import { readScoped } from "@/utils/storage";
import { Button } from "@/components/ui/button";

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
    <div className="mt-1 text-sm font-bold text-slate-700">{value ?? "---"}</div>
  </div>
);

const StudentDetailsDialog = ({ student, isOpen, onClose }: StudentDetailsDialogProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const classesForStudent = useMemo(() => {
    if (!student) return [] as SchoolClass[];
    try {
      // Turmas são SEMPRE do projeto ativo
      const raw = readScoped<SchoolClass[]>("classes", []);
      return raw.filter((c) => (c.studentIds || []).includes(student.id));
    } catch {
      return [];
    }
  }, [student, isOpen]);

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

  if (!student) return null;

  const onEdit = () => {
    onClose();
    const isTeacherArea = location.pathname.startsWith('/professor');
    const base = isTeacherArea ? '/professor' : '';
    navigate(`${base}/alunos/editar/${student.id}`);
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
              <div className="h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-[1.75rem] sm:rounded-[2rem] border-4 border-white/30 bg-white/20 shadow-xl flex items-center justify-center">
                {student.photo ? (
                  <img
                    src={student.photo}
                    alt={student.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-10 w-10 text-white/50" />
                )}
              </div>
              <div className="space-y-2">
                <DialogTitle className="text-2xl font-black tracking-tight">
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
                onClick={onEdit}
                className="rounded-2xl bg-white text-primary hover:bg-white/90 font-black gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Editar aluno
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-5 pb-10 sm:p-6 sm:pb-12 md:p-8">
            <Tabs defaultValue="pessoais" className="w-full">
              <TabsList className="w-full justify-start gap-2 rounded-[1.5rem] bg-slate-50 p-2 border border-slate-100 overflow-x-auto">
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
                  <Row label="Telefone" value={student.phone || "---"} />
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
            </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default StudentDetailsDialog;