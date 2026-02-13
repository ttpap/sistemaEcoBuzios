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
  cnpj: z.string().min(14, "CNPJ inválido").max(18),
  companyName: z.string().min(2, "Nome da empresa é obrigatório"),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Valor deve ser maior que zero"),
  date: z.string().min(1, "Data é obrigatória"),
});

interface ExpenseFormProps {
  onAddExpense: (expense: Expense) => void;
}

const ExpenseForm = ({ onAddExpense }: ExpenseFormProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cnpj: "",
      companyName: "",
      amount: "",
      date: new Date().toISOString().split('T')[0],
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const newExpense: Expense = {
      id: crypto.randomUUID(),
      cnpj: values.cnpj,
      companyName: values.companyName,
      amount: Number(values.amount),
      date: values.date,
    };
    
    onAddExpense(newExpense);
    form.reset({
      cnpj: "",
      companyName: "",
      amount: "",
      date: new Date().toISOString().split('T')[0],
    });
    showSuccess("Despesa registrada com sucesso!");
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <PlusCircle className="h-5 w-5 text-primary" />
          Nova Prestação de Contas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-end">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da empresa" {...field} />
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
                  <FormLabel>CNPJ</FormLabel>
                  <FormControl>
                    <Input placeholder="00.000.000/0000-00" {...field} />
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
                  <FormLabel>Valor (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0,00" {...field} />
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
                  <FormLabel>Data</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="md:col-span-2 lg:col-span-4 flex justify-end">
              <Button type="submit" className="w-full md:w-auto">
                Adicionar Registro
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ExpenseForm;