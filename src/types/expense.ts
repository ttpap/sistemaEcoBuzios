export interface Expense {
  id: string;
  companyName: string; // 5 - CREDOR
  cnpj: string;        // 6 - C.N.P.J./C.P.F.
  paymentMethod: string; // 7 - Forma de Pagto/Nº
  date: string;         // 8 - Data pagamento
  docNumber: string;    // 9 - Doc. de Despesa/Nº
  dueDate: string;      // 10 - Data vencimento
  amount: number;       // 11 - Valor
}