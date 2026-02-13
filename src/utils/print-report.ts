import { Expense } from "@/types/expense";
import { format } from "date-fns";

export const printExpenseReport = (expenses: Expense[]) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const html = `
    <html>
      <head>
        <title>Relatório de Prestação de Contas</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 10px; margin: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid black; padding: 4px 6px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .text-right { text-align: right; }
          .header { font-weight: bold; margin-bottom: 10px; font-size: 12px; }
          @media print {
            @page { size: landscape; margin: 1cm; }
          }
        </style>
      </head>
      <body>
        <div class="header">RELATÓRIO DE PRESTAÇÃO DE CONTAS</div>
        <table>
          <thead>
            <tr>
              <th>4 - ITEM ORÇ</th>
              <th>5 - CREDOR</th>
              <th>6 - C.N.P.J./C.P.F.</th>
              <th>7 - Forma de Pagto/Nº</th>
              <th>8 - Data pagamento</th>
              <th>9 - Doc. de Despesa/Nº</th>
              <th>10 - Data vencimento</th>
              <th class="text-right">11 - Valor</th>
            </tr>
          </thead>
          <tbody>
            ${expenses.map((exp, index) => `
              <tr>
                <td>${index + 1}) ${exp.budgetItem}</td>
                <td>${exp.companyName}</td>
                <td>${exp.cnpj}</td>
                <td>${exp.paymentMethod}</td>
                <td>${formatDate(exp.date)}</td>
                <td>${exp.docNumber}</td>
                <td>${formatDate(exp.dueDate)}</td>
                <td class="text-right">${formatCurrency(exp.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="7" class="text-right"><strong>TOTAL:</strong></td>
              <td class="text-right"><strong>${formatCurrency(expenses.reduce((acc, curr) => acc + curr.amount, 0))}</strong></td>
            </tr>
          </tfoot>
        </table>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
};