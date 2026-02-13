"use client";

import React from 'react';
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
import { Trash2, FileText, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ExpenseListProps {
  expenses: Expense[];
  onDeleteExpense: (id: string) => void;
}

const ExpenseList = ({ expenses, onDeleteExpense }: ExpenseListProps) => {
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

  const openAttachment = (base64: string) => {
    const win = window.open();
    if (win) {
      win.document.write(
        `<iframe src="${base64}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
      );
    }
  };

  return (
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
                <TableHead className="w-[50px]">Anexo</TableHead>
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
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-primary hover:bg-primary/10"
                                onClick={() => openAttachment(expense.attachment!)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver Nota Fiscal</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <div className="w-8 h-8 flex items-center justify-center text-muted-foreground/30">
                          -
                        </div>
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
  );
};

export default ExpenseList;