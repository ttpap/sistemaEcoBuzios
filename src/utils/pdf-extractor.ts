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

    // 1. Buscar CNPJ (Emitente)
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

    // 3. Buscar Valor (Valor do Serviço ou Valor Líquido)
    const amountRegex = /(?:Valor do Serviço|Valor Líquido|R\$)\s*[:\s]*([\d.]+,\d{2})/i;
    const amountMatch = fullText.match(amountRegex);
    if (amountMatch) {
      const valueStr = amountMatch[1].replace(/\./g, '').replace(',', '.');
      data.amount = parseFloat(valueStr);
    }

    // 4. Buscar Número do Documento (Focado no Número da NFS-e)
    // O regex abaixo procura especificamente por "Número da NFS-e" e pega o primeiro número que segue
    const nfsSpecificRegex = /Número\s+da\s+NFS-e\s*[:\s]*(\d+)/i;
    const nfsSpecificMatch = fullText.match(nfsSpecificRegex);
    
    if (nfsSpecificMatch) {
      data.docNumber = nfsSpecificMatch[1];
    } else {
      // Fallback para outros formatos se o específico falhar
      const docRegex = /(?:NFS-e|N[º°]|DOC|NOTA|NÚMERO|NUMERO)\s*[:\s]*(\d+)/i;
      const docMatch = fullText.match(docRegex);
      if (docMatch) data.docNumber = docMatch[1];
    }

    // 5. Nome da Empresa (Emitente)
    const nameLabelRegex = /Nome\s*\/\s*Nome\s*Empresarial\s*[:\s]*([^0-9\n]{3,100})/i;
    const nameMatch = fullText.match(nameLabelRegex);
    
    if (nameMatch && nameMatch[1]) {
      data.companyName = nameMatch[1].trim();
    } else {
      const lines = fullText.split(/\s{2,}/).filter(l => l.trim().length > 3);
      if (lines.length > 0) {
        data.companyName = lines[0].trim().substring(0, 60);
      }
    }

    return data;
  } catch (error) {
    console.error("Erro detalhado no extrator:", error);
    throw new Error("Falha ao processar o arquivo PDF.");
  }
};