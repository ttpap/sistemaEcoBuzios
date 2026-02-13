"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { FileUp, Loader2, FileCheck } from "lucide-react";
import { extractDataFromPDF, ExtractedData } from '@/utils/pdf-extractor';
import { showSuccess, showError } from '@/utils/toast';

interface PDFUploaderProps {
  onDataExtracted: (data: ExtractedData) => void;
}

const PDFUploader = ({ onDataExtracted }: PDFUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      showError("Por favor, selecione apenas arquivos PDF.");
      return;
    }

    setIsUploading(true);
    try {
      const data = await extractDataFromPDF(file);
      onDataExtracted(data);
      showSuccess("Dados extraídos do PDF com sucesso!");
    } catch (error) {
      console.error("Erro ao processar PDF:", error);
      showError("Não foi possível ler o PDF. Tente preencher manualmente.");
    } finally {
      setIsUploading(false);
      // Limpa o input para permitir subir o mesmo arquivo novamente se necessário
      event.target.value = '';
    }
  };

  return (
    <div className="mb-6">
      <label className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-primary/30 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer group">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {isUploading ? (
            <>
              <Loader2 className="w-8 h-8 mb-3 text-primary animate-spin" />
              <p className="text-sm text-primary font-medium">Processando documento...</p>
            </>
          ) : (
            <>
              <FileUp className="w-8 h-8 mb-3 text-primary/60 group-hover:text-primary transition-colors" />
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-primary">Clique para subir um PDF</span> ou arraste aqui
              </p>
              <p className="text-xs text-muted-foreground mt-1">O sistema preencherá os dados automaticamente</p>
            </>
          )}
        </div>
        <input 
          type="file" 
          className="hidden" 
          accept=".pdf" 
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </label>
    </div>
  );
};

export default PDFUploader;