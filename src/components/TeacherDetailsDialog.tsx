"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TeacherRegistration } from '@/types/teacher';
import { User, MapPin, Landmark, Mail, Phone, ShieldCheck, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TeacherDetailsDialogProps {
  teacher: TeacherRegistration | null;
  isOpen: boolean;
  onClose: () => void;
}

const TeacherDetailsDialog = ({ teacher, isOpen, onClose }: TeacherDetailsDialogProps) => {
  if (!teacher) return null;

  const InfoRow = ({ label, value, fullWidth = false }: { label: string, value?: string | number | boolean, fullWidth?: boolean }) => (
    <div className={`py-2 border-b border-slate-50 last:border-0 ${fullWidth ? 'md:col-span-2' : ''}`}>
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
              {teacher.photo ? (
                <img src={teacher.photo} alt={teacher.fullName} className="w-full h-full object-cover" />
              ) : (
                <User className="h-10 w-10 text-white/50" />
              )}
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-black tracking-tight">{teacher.fullName}</DialogTitle>
              <div className="flex items-center gap-2">
                <Badge className="bg-secondary text-primary font-black border-none">
                  {teacher.status}
                </Badge>
                <Badge className="bg-white/20 text-white border-none">
                  {teacher.gender}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-full max-h-[calc(90vh-160px)] p-8">
          <div className="space-y-6">
            <Section icon={User} title="1. Dados Gerais">
              <InfoRow label="CPF" value={teacher.cpf} />
              <InfoRow label="RG" value={teacher.rg} />
              <InfoRow label="CNPJ" value={teacher.cnpj} />
              <InfoRow label="E-mail" value={teacher.email} />
              <InfoRow label="Celular" value={teacher.cellPhone} />
            </Section>

            <Section icon={MapPin} title="2. Endereço">
              <InfoRow label="CEP" value={teacher.cep} />
              <InfoRow label="Bairro" value={teacher.neighborhood} />
              <InfoRow label="Logradouro" value={teacher.street} />
              <InfoRow label="Número" value={teacher.number} />
              <InfoRow label="Complemento" value={teacher.complement} />
              <InfoRow label="Cidade/UF" value={`${teacher.city} - ${teacher.uf}`} />
            </Section>

            <Section icon={Landmark} title="3. Dados Bancários">
              <InfoRow label="Banco" value={teacher.bank} fullWidth />
              <InfoRow label="Agência" value={teacher.agency} />
              <InfoRow label="Conta" value={teacher.account} />
              <InfoRow label="Chave PIX" value={teacher.pixKey} fullWidth />
            </Section>

            <Section icon={Info} title="Sistema">
              <InfoRow label="Data de Cadastro" value={new Date(teacher.registrationDate).toLocaleString('pt-BR')} />
              <InfoRow label="ID do Registro" value={teacher.id} fullWidth />
            </Section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default TeacherDetailsDialog;