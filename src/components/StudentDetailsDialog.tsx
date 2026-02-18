"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StudentRegistration } from '@/types/student';
import { User, MapPin, HeartPulse, School, ShieldAlert, FileText, Camera } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface StudentDetailsDialogProps {
  student: StudentRegistration | null;
  isOpen: boolean;
  onClose: () => void;
}

const StudentDetailsDialog = ({ student, isOpen, onClose }: StudentDetailsDialogProps) => {
  if (!student) return null;

  const InfoRow = ({ label, value }: { label: string, value?: string | number | boolean }) => (
    <div className="py-2 border-b border-slate-50 last:border-0">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold text-slate-700">{value?.toString() || '---'}</p>
    </div>
  );

  const Section = ({ icon: Icon, title, children }: { icon: any, title: string, children: React.ReactNode }) => (
    <div className="space-y-4 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-white p-2 rounded-xl shadow-sm">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h4 className="text-xs font-black text-primary uppercase tracking-widest">{title}</h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
        {children}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden rounded-[3rem] border-none shadow-2xl">
        <DialogHeader className="p-8 bg-primary text-white">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-[2rem] bg-white/20 border-4 border-white/30 overflow-hidden flex items-center justify-center shadow-xl">
              {student.photo ? (
                <img src={student.photo} alt={student.fullName} className="w-full h-full object-cover" />
              ) : (
                <User className="h-10 w-10 text-white/50" />
              )}
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-black tracking-tight">{student.fullName}</DialogTitle>
              <div className="flex items-center gap-2">
                <Badge className="bg-secondary text-primary font-black border-none">
                  Matrícula: {student.registration}
                </Badge>
                <Badge className="bg-white/20 text-white border-none">
                  {student.age} anos
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-full max-h-[calc(90vh-160px)] p-8">
          <div className="space-y-6">
            <Section icon={User} title="Dados Pessoais">
              <InfoRow label="Nome Social" value={student.socialName} />
              <InfoRow label="Nome Preferido" value={student.preferredName} />
              <InfoRow label="CPF" value={student.cpf} />
              <InfoRow label="RG" value={student.rg} />
              <InfoRow label="Data de Nasc." value={student.birthDate.split('-').reverse().join('/')} />
              <InfoRow label="Gênero" value={student.gender} />
              <InfoRow label="Raça/Cor" value={student.race} />
              <InfoRow label="E-mail" value={student.email} />
            </Section>

            {student.guardianName && (
              <Section icon={ShieldAlert} title="Responsável">
                <InfoRow label="Nome" value={student.guardianName} />
                <InfoRow label="Parentesco" value={student.guardianKinship} />
                <InfoRow label="Telefone" value={student.guardianPhone} />
              </Section>
            )}

            <Section icon={School} title="Escolaridade">
              <InfoRow label="Rede" value={student.schoolType} />
              <InfoRow label="Unidade" value={student.schoolName} />
            </Section>

            <Section icon={MapPin} title="Endereço">
              <InfoRow label="CEP" value={student.cep} />
              <InfoRow label="Bairro" value={student.neighborhood} />
              <div className="md:col-span-2">
                <InfoRow label="Logradouro" value={`${student.street}, ${student.number} ${student.complement ? `- ${student.complement}` : ''}`} />
              </div>
            </Section>

            <Section icon={HeartPulse} title="Saúde">
              <InfoRow label="Tipo Sanguíneo" value={student.bloodType} />
              <InfoRow label="Alergias" value={student.hasAllergy ? student.allergyDetail : 'Não'} />
              <InfoRow label="Nec. Especiais" value={student.hasSpecialNeeds ? student.specialNeedsDetail : 'Não'} />
              <InfoRow label="Medicamentos" value={student.usesMedication ? student.medicationDetail : 'Não'} />
              <InfoRow label="Restrição Física" value={student.hasPhysicalRestriction ? student.physicalRestrictionDetail : 'Não'} />
              <InfoRow label="Histórico Cardíaco" value={student.familyHeartHistory ? 'Sim' : 'Não'} />
            </Section>

            <Section icon={Camera} title="Autorizações">
              <InfoRow label="Uso de Imagem" value={student.imageAuthorization === 'authorized' ? 'Autorizado' : 'Não Autorizado'} />
            </Section>

            <Section icon={FileText} title="Documentação">
              <div className="md:col-span-2 flex flex-wrap gap-2 mt-2">
                {student.docsDelivered.map(doc => (
                  <Badge key={doc} variant="outline" className="rounded-lg border-primary/20 text-primary font-bold">
                    {doc}
                  </Badge>
                ))}
                {student.docsDelivered.length === 0 && <p className="text-sm text-slate-400">Nenhum documento registrado.</p>}
              </div>
            </Section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default StudentDetailsDialog;