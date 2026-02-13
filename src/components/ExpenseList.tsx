"use client";

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Expense } from '@/types/expense';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trash2, FileText, Download, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

interface ExpenseListProps {
  expenses: Expense[];
  onDeleteExpense: (id: string) => void;
}

const ExpenseList = ({ expenses, onDeleteExpense }: ExpenseListProps) => {
  const [selectedAttachment, setSelectedAttachment] = useState<{ base64: string, name: string } | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR });
    } catch (e) {
      return dateStr;
    }
  };

  const downloadAttachment = (base64: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = base64;
    link.download = fileName || 'nota-fiscal.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Registros de Prestação de Contas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[100px]">Ações PDF</TableHead>
                  <TableHead className="whitespace-nowrap">Pagamento</TableHead>
                  <TableHead>Credor / CNPJ</TableHead>
                  <TableHead className="hidden lg:table-cell">Doc. Nº</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        {expense.attachment ? (
                          <div className="flex gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-primary hover:bg-primary/10"
                                    onClick={() => setSelectedAttachment({ 
                                      base64: expense.attachment!, 
                                      name: expense.attachmentName || 'nota.pdf' 
                                    })}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Visualizar</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-green-600 hover:bg-green-50"
                                    onClick={() => downloadAttachment(expense.attachment!, expense.attachmentName || 'nota.pdf')}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Baixar PDF</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        ) : (
                          <div className="text-muted-foreground/30 text-xs ml-2">Sem anexo</div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        {formatDate(expense.date)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{expense.companyName}</div>
                        <div className="text-xs text-muted-foreground">{expense.cnpj}</div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {expense.docNumber}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onDeleteExpense(expense.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedAttachment} onOpenChange={(open) => !open && setSelectedAttachment(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-base font-medium truncate pr-8">
              {selectedAttachment?.name}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="gap-2"
                onClick={() => selectedAttachment && downloadAttachment(selectedAttachment.base64, selectedAttachment.name)}
              >
                <Download className="h-4 w-4" />
                Baixar
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 bg-slate-100 relative">
            {selectedAttachment && (
              <iframe
                src={selectedAttachment.base64}
                className="w-full h-full border-none"
                title="Visualização do PDF"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExpenseList;