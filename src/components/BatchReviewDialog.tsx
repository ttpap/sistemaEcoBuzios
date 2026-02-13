"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Expense } from '@/types/expense';
import { Check, X, AlertTriangle } from 'lucide-react';

interface BatchReviewDialogProps {
  isOpen: boolean;
  pendingExpenses: Expense[];
  onConfirm: (expenses: Expense[]) => void;
  onCancel: () => void;
  onRemoveItem: (id: string) => void;
}

const BatchReviewDialog = ({ isOpen, pendingExpenses, onConfirm, onCancel, onRemoveItem }: BatchReviewDialogProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Check className="h-6 w-6 text-emerald-500" />
            Revisar Notas Extraídas ({pendingExpenses.length})
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Confira os dados abaixo antes de confirmar o lançamento definitivo no sistema.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-auto my-4 border rounded-xl">
          <Table>
            <TableHeader className="bg-slate-50 sticky top-0 z-10">
              <TableRow>
                <TableHead>Credor</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Doc. Nº</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingExpenses.map((exp) => (
                <TableRow key={exp.id}>
                  <TableCell className="font-medium">{exp.companyName}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{exp.cnpj}</TableCell>
                  <TableCell>{exp.docNumber}</TableCell>
                  <TableCell>{exp.date.split('-').reverse().join('/')}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(exp.amount)}</TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive"
                      onClick={() => onRemoveItem(exp.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>Descartar Tudo</Button>
          <Button onClick={() => onConfirm(pendingExpenses)} className="bg-slate-900">
            Confirmar e Salvar Todos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BatchReviewDialog;