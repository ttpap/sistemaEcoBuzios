export interface Expense {
  id: string;
  budgetItem: string; // Coluna 4 - ITEM ORÇ
  companyName: string; // Coluna 5 - CREDOR
  cnpj: string; // Coluna 6 - C.N.P.J./C.P.F.
  paymentMethod: string; // Coluna 7 - Forma de Pagto/Nº
  date: string; // Coluna 8 - Data pagamento
  docNumber: string; // Coluna 9 - Doc. de Despesa/Nº
  dueDate: string; // Coluna 10 - Data vencimento
  amount: number; // Coluna 11 - Valor
  attachment?: string;
  attachmentName?: string;
}