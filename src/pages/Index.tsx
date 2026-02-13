"use client";

import React, { useState, useEffect } from 'react';
import ExpenseForm, { ExpenseFormData } from '@/components/ExpenseForm';
import ExpenseCard from '@/components/ExpenseCard';
import StatsSummary from '@/components/StatsSummary';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showSuccess } from "@/utils/toast";

interface Expense extends ExpenseFormData {
  id: string;
}

const Index = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Carregar dados do localStorage ao iniciar
  useEffect(() => {
    const saved = localStorage.getItem('my-expenses');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Converter strings de data de volta para objetos Date
        const withDates = parsed.map((e: any) => ({
          ...e,
          date: new Date(e.date)
        }));
        setExpenses(withDates);
      } catch (e) {
        console.error("Erro ao carregar despesas", e);
      }
    }
  }, []);

  // Salvar no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem('my-expenses', JSON.stringify(expenses));
  }, [expenses]);

  const handleAddExpense = (data: ExpenseFormData) => {
    const newExpense: Expense = {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
    };
    setExpenses([newExpense, ...expenses]);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
    showSuccess("Despesa removida.");
  };

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Empresa,CNPJ,Valor,Data\n"
      + expenses.map(e => `${e.companyName},${e.cnpj},${e.value},${e.date.toLocaleDateString()}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "prestacao_contas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess("Relatório exportado com sucesso!");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Header */}
      <header className="bg-white border-b border-indigo-50 py-6 mb-8 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <FileText className="text-white w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Prestação de <span className="text-indigo-600">Contas</span>
            </h1>
          </div>
          {expenses.length > 0 && (
            <Button 
              onClick={handleExport}
              variant="outline" 
              className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-5xl">
        <StatsSummary expenses={expenses} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Coluna do Formulário */}
          <div className="lg:col-span-5">
            <div className="sticky top-24">
              <ExpenseForm onAddExpense={handleAddExpense} />
            </div>
          </div>

          {/* Coluna da Lista */}
          <div className="lg:col-span-7">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-700">Histórico de Lançamentos</h2>
              <span className="text-xs font-medium px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                {expenses.length} itens
              </span>
            </div>

            <div className="space-y-4">
              {expenses.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-indigo-100">
                  <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ReceiptText className="text-indigo-300 w-8 h-8" />
                  </div>
                  <h3 className="text-gray-600 font-medium">Nenhuma despesa lançada</h3>
                  <p className="text-gray-400 text-sm mt-1">Use o formulário ao lado para começar sua prestação.</p>
                </div>
              ) : (
                expenses.map((expense) => (
                  <ExpenseCard 
                    key={expense.id} 
                    expense={expense} 
                    onDelete={handleDeleteExpense} 
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-20">
        <MadeWithDyad />
      </footer>
    </div>
  );
};

export default Index;