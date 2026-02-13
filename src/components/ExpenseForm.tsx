"use client";

import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";
import { Expense } from '@/types/expense';
import { showSuccess } from '@/utils/toast';

const formSchema = z.object({
  companyName: z.string().min(2, "O nome do credor é obrigatório"),
  cnpj: z.string().min(11, "CPF/CNPJ inválido"),
  paymentMethod: z.string().min(1, "Informe a forma de pagamento"),
  date: z.string().min(1, "A data de pagamento é obrigatória"),
  docNumber: z.string().min(1, "O número do documento é obrigatório"),
  dueDate: z.string().min(1, "A data de vencimento é obrigatória"),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "O valor deve ser maior que zero"),
});

interface ExpenseFormProps {
  onAddExpense: (expense: Expense) => void;
}

const ExpenseForm = ({ onAddExpense }: ExpenseFormProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      cnpj: "",
      paymentMethod: "",
      date: new Date().toISOString().split('T')[0],
      docNumber: "",
      dueDate: new Date().toISOString().split('T')[0],
      amount: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const newExpense: Expense = {
      id: crypto.randomUUID(),
      companyName: values.companyName,
      cnpj: values.cnpj,
      paymentMethod: values.paymentMethod,
      date: values.date,
      docNumber: values.docNumber,
      dueDate: values.dueDate,
      amount: Number(values.amount),
    };
    
    onAddExpense(newExpense);
    form.reset({
      companyName: "",
      cnpj: "",
      paymentMethod: "",
      date: new Date().toISOString().split('T')[0],
      docNumber: "",
      dueDate: new Date().toISOString().split('T')[0],
      amount: "",
    });
    showSuccess("Registro adicionado com sucesso!");
  }

  return (
    <Card className="mb-8 border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <PlusCircle className="h-5 w-5 text-primary" />
          Novo Lançamento de Despesa
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-end">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>5 - CREDOR</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da empresa ou pessoa" {...field} />
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
                    <Input placeholder="00.000.000/0000-00" {...field} />
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
                    <Input placeholder="Ex: PIX, Boleto, Dinheiro" {...field} />
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
                    <Input placeholder="Nº da Nota ou Recibo" {...field} />
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
            <div className="lg:col-span-2 flex justify-end">
              <Button type="submit" className="w-full md:w-auto px-8">
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