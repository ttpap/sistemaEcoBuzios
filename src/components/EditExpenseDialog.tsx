"use client";

import React, { useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Expense } from '@/types/expense';
import { Edit2 } from 'lucide-react';

const formSchema = z.object({
  budgetItem: z.string().default(""),
  companyName: z.string().default(""),
  cnpj: z.string().default(""),
  paymentMethod: z.string().default(""),
  date: z.string().default(""),
  docNumber: z.string().default(""),
  dueDate: z.string().default(""),
  amount: z.string().default("0"),
});

interface EditExpenseDialogProps {
  isOpen: boolean;
  expense: Expense | null;
  onClose: () => void;
  onSave: (updatedExpense: Expense) => void;
}

const EditExpenseDialog = ({ isOpen, expense, onClose, onSave }: EditExpenseDialogProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      budgetItem: "",
      companyName: "",
      cnpj: "",
      paymentMethod: "",
      date: "",
      docNumber: "",
      dueDate: "",
      amount: "0",
    },
  });

  useEffect(() => {
    if (expense) {
      form.reset({
        budgetItem: expense.budgetItem,
        companyName: expense.companyName,
        cnpj: expense.cnpj,
        paymentMethod: expense.paymentMethod,
        date: expense.date,
        docNumber: expense.docNumber,
        dueDate: expense.dueDate,
        amount: expense.amount.toString(),
      });
    }
  }, [expense, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!expense) return;

    const updatedExpense: Expense = {
      ...expense,
      budgetItem: values.budgetItem,
      companyName: values.companyName,
      cnpj: values.cnpj,
      paymentMethod: values.paymentMethod,
      date: values.date,
      docNumber: values.docNumber,
      dueDate: values.dueDate,
      amount: Number(values.amount),
    };
    
    onSave(updatedExpense);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5" />
            Editar Lançamento
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2 py-4">
            <FormField
              control={form.control}
              name="budgetItem"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>4 - ITEM ORÇ</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>5 - CREDOR</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cnpj"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>6 - C.N.P.J./C.P.F.</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>7 - Forma de Pagto/Nº</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>8 - Data pagamento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="docNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>9 - Doc. de Despesa/Nº</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>10 - Data vencimento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>11 - Valor (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="md:col-span-2 mt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit">Salvar Alterações</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditExpenseDialog;