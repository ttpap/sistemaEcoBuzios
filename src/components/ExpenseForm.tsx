"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, PlusCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { showSuccess } from "@/utils/toast";

const formSchema = z.object({
  companyName: z.string().min(2, "Nome da empresa é obrigatório"),
  cnpj: z.string().min(14, "CNPJ inválido").max(18),
  value: z.string().min(1, "Valor é obrigatório"),
  date: z.date({
    required_error: "Data é obrigatória",
  }),
});

export type ExpenseFormData = z.infer<typeof formSchema>;

interface ExpenseFormProps {
  onAddExpense: (data: ExpenseFormData) => void;
}

const ExpenseForm = ({ onAddExpense }: ExpenseFormProps) => {
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<ExpenseFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
    }
  });

  const date = watch("date");

  const onSubmit = (data: ExpenseFormData) => {
    onAddExpense(data);
    showSuccess("Despesa adicionada com sucesso!");
    reset();
  };

  return (
    <Card className="w-full border-none shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-indigo-900 flex items-center gap-2">
          <PlusCircle className="w-5 h-5" />
          Nova Despesa
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nome da Empresa</Label>
              <Input 
                id="companyName" 
                placeholder="Ex: Posto de Gasolina" 
                {...register("companyName")}
                className="border-indigo-100 focus:ring-indigo-500"
              />
              {errors.companyName && <p className="text-xs text-red-500">{errors.companyName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input 
                id="cnpj" 
                placeholder="00.000.000/0000-00" 
                {...register("cnpj")}
                className="border-indigo-100 focus:ring-indigo-500"
              />
              {errors.cnpj && <p className="text-xs text-red-500">{errors.cnpj.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Valor (R$)</Label>
              <Input 
                id="value" 
                type="number" 
                step="0.01"
                placeholder="0,00" 
                {...register("value")}
                className="border-indigo-100 focus:ring-indigo-500"
              />
              {errors.value && <p className="text-xs text-red-500">{errors.value.message}</p>}
            </div>

            <div className="space-y-2 flex flex-col">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal border-indigo-100",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setValue("date", d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.date && <p className="text-xs text-red-500">{errors.date.message}</p>}
            </div>
          </div>

          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-6 rounded-xl transition-all transform hover:scale-[1.02]">
            Adicionar à Prestação
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ExpenseForm;