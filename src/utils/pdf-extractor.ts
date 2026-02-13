import * as pdfjsLib from 'pdfjs-dist';

// Usando uma versão específica do worker que coincide com a biblioteca instalada
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export interface ExtractedData {
  companyName?: string;
  cnpj?: string;
  amount?: number;
  date?: string;
  docNumber?: string;
  dueDate?: string;
}

export const extractDataFromPDF = async (file: File): Promise<ExtractedData> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: true,
      isEvalSupported: false,
    });
    
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + ' ';
    }

    console.log("Texto extraído do PDF:", fullText);

    const data: ExtractedData = {};

    // 1. Buscar CNPJ do Emitente (Geralmente o primeiro que aparece)
    const cnpjRegex = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/;
    const cnpjMatch = fullText.match(cnpjRegex);
    if (cnpjMatch) data.cnpj = cnpjMatch[0];

    // 2. Buscar Datas
    const dateRegex = /(\d{2}\/\d{2}\/\d{4})/g;
    const dateMatches = fullText.match(dateRegex);
    if (dateMatches && dateMatches.length > 0) {
      const convertDate = (d: string) => {
        const [day, month, year] = d.split('/');
        return `${year}-${month}-${day}`;
      };
      
      data.date = convertDate(dateMatches[0]);
      if (dateMatches.length > 1) {
        data.dueDate = convertDate(dateMatches[1]);
      }
    }

    // 3. Buscar Valor (Valor Líquido ou Valor do Serviço)
    const amountRegex = /(?:Valor Líquido da NFS-e|Valor do Serviço|R\$)\s*[:\s]*([\d.]+,\d{2})/i;
    const amountMatch = fullText.match(amountRegex);
    if (amountMatch) {
      const valueStr = amountMatch[1].replace(/\./g, '').replace(',', '.');
      data.amount = parseFloat(valueStr);
    }

    // 4. Buscar Número da NFS-e
    const nfsRegex = /Número\s+da\s+NFS-e\s*[:\s]*(\d+)/i;
    const nfsMatch = fullText.match(nfsRegex);
    if (nfsMatch) {
      data.docNumber = nfsMatch[1];
    }

    // 5. Nome do Credor (Emitente / Prestador)
    // Procuramos o texto entre "Nome / Nome Empresarial" e o próximo campo (geralmente "Endereço" ou "E-mail")
    // Focando na primeira ocorrência que é a do Emitente
    const nameSectionRegex = /Nome\s*\/\s*Nome\s*Empresarial\s*[:\s]*(.*?)(?=Endereço|E-mail|Inscrição|CNPJ|$)/i;
    const nameMatch = fullText.match(nameSectionRegex);
    
    if (nameMatch && nameMatch[1]) {
      let name = nameMatch[1].trim();
      // Remove números iniciais (comum em extrações de PDF onde o CNPJ ou parte dele vem antes do nome)
      name = name.replace(/^[\d.\s/-]+/, '').trim();
      data.companyName = name;
    }

    return data;
  } catch (error) {
    console.error("Erro detalhado no extrator:", error);
    throw new Error("Falha ao processar o arquivo PDF.");
  }
};