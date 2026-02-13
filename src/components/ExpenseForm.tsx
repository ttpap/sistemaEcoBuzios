"use client";

import React, { useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Sparkles, FileCheck } from "lucide-react";
import { Expense } from '@/types/expense';
import { showSuccess } from '@/utils/toast';
import { ExtractedData } from '@/utils/pdf-extractor';

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

interface ExpenseFormProps {
  onAddExpense: (expense: Expense) => void;
  initialData?: ExtractedData | null;
  attachment?: { base64: string; name: string } | null;
}

const ExpenseForm = ({ onAddExpense, initialData, attachment }: ExpenseFormProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      budgetItem: "",
      companyName: "",
      cnpj: "",
      paymentMethod: "",
      date: new Date().toISOString().split('T')[0],
      docNumber: "",
      dueDate: new Date().toISOString().split('T')[0],
      amount: "",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        budgetItem: form.getValues('budgetItem') || "Pendente",
        companyName: initialData.companyName || "",
        cnpj: initialData.cnpj || "",
        paymentMethod: form.getValues('paymentMethod') || "A definir",
        date: initialData.date || new Date().toISOString().split('T')[0],
        docNumber: initialData.docNumber || "S/N",
        dueDate: initialData.dueDate || initialData.date || new Date().toISOString().split('T')[0],
        amount: initialData.amount?.toString() || "0",
      });
    }
  }, [initialData, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const newExpense: Expense = {
      id: crypto.randomUUID(),
      budgetItem: values.budgetItem || "Não informado",
      companyName: values.companyName || "Não informado",
      cnpj: values.cnpj || "Não informado",
      paymentMethod: values.paymentMethod || "Não informado",
      date: values.date || new Date().toISOString().split('T')[0],
      docNumber: values.docNumber || "S/N",
      dueDate: values.dueDate || values.date || new Date().toISOString().split('T')[0],
      amount: Number(values.amount) || 0,
      attachment: attachment?.base64,
      attachmentName: attachment?.name,
    };
    
    onAddExpense(newExpense);
    form.reset({
      budgetItem: "",
      companyName: "",
      cnpj: "",
      paymentMethod: "",
      date: new Date().toISOString().split('T')[0],
      docNumber: "",
      dueDate: new Date().toISOString().split('T')[0],
      amount: "",
    });
    showSuccess("Registro salvo!");
  }

  return (
    <Card className="mb-8 border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <PlusCircle className="h-5 w-5 text-primary" />
          Lançamento de Despesa
        </CardTitle>
        <div className="flex gap-2">
          {attachment && (
            <div className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
              <FileCheck className="h-3 w-3" />
              PDF Anexado
            </div>
          )}
          {initialData && (
            <div className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full animate-pulse">
              <Sparkles className="h-3 w-3" />
              Dados extraídos
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-end">
            <FormField
              control={form.control}
              name="budgetItem"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>4 - ITEM ORÇ</FormLabel>
                  <FormControl>
                    <Input placeholder="Opcional" {...field} />
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
                    <Input placeholder="Opcional" {...field} />
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
                    <Input placeholder="Opcional" {...field} />
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
                    <Input placeholder="Opcional" {...field} />
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
                    <Input placeholder="Opcional" {...field} />
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
                    <Input type="number" step="0.01" placeholder="0,00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="lg:col-span-1 flex justify-end">
              <Button type="submit" className="w-full px-8">
                Salvar Registro
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ExpenseForm;