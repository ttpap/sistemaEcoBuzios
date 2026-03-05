"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User, MapPin, Camera, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { showSuccess, showError } from "@/utils/toast";
import { useNavigate } from "react-router-dom";
import type { CoordinatorRegistration } from "@/types/coordinator";
import { createGlobalCoordinator, updateGlobalCoordinator } from "@/utils/coordinators";
import { lookupCep } from "@/utils/cep";
import { upsertCoordinator } from "@/integrations/supabase/coordinators";

const BRAZILIAN_BANKS = [
  "001 - Banco do Brasil",
  "033 - Santander",
  "104 - Caixa Econômica Federal",
  "237 - Bradesco",
  "341 - Itaú Unibanco",
  "077 - Banco Inter",
  "260 - Nubank",
  "336 - C6 Bank",
  "290 - PagBank",
  "422 - Banco Safra",
  "748 - Sicredi",
  "041 - Banrisul",
  "070 - BRB",
];

const formSchema = z.object({
  fullName: z.string().min(3, "Obrigatório"),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  cnpj: z.string().optional(),
  email: z.string().email("E-mail inválido"),
  cellPhone: z.string().min(1, "Obrigatório"),
  gender: z.enum(["Feminino", "Masculino", "Outro"]),
  photo: z.string().optional(),

  cep: z.string().min(8, "CEP inválido"),
  street: z.string().min(1, "Obrigatório"),
  number: z.string().min(1, "Obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, "Obrigatório"),
  city: z.string().default("Armação dos Búzios"),
  uf: z.string().default("RJ"),

  bank: z.string().min(1, "Obrigatório"),
  customBank: z.string().optional(),
  agency: z.string().min(1, "Obrigatório"),
  account: z.string().min(1, "Obrigatório"),
  pixKey: z.string().min(1, "Obrigatório"),
});

interface CoordinatorFormProps {
  initialData?: CoordinatorRegistration | null;
  redirectTo?: string | null;
  onCompleted?: (result: { login: string; password: string }) => void;
}

export default function CoordinatorForm({ initialData, redirectTo, onCompleted }: CoordinatorFormProps) {
  const navigate = useNavigate();
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialData?.photo || null);
  const [isCustomBank, setIsCustomBank] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          bank: BRAZILIAN_BANKS.includes(initialData.bank) ? initialData.bank : "outro",
          customBank: BRAZILIAN_BANKS.includes(initialData.bank) ? "" : initialData.bank,
        }
      : {
          city: "Armação dos Búzios",
          uf: "RJ",
          gender: "Feminino",
          bank: "",
        },
  });

  const cep = form.watch("cep");
  const selectedBank = form.watch("bank");

  useEffect(() => {
    setIsCustomBank(selectedBank === "outro");
  }, [selectedBank]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const res = await lookupCep(cep || "");
      if (cancelled || !res) return;

      form.setValue("street", res.street || "", { shouldDirty: true, shouldValidate: true });
      form.setValue("neighborhood", res.neighborhood || "", { shouldDirty: true, shouldValidate: true });
      form.setValue("city", res.city || "Armação dos Búzios", { shouldDirty: true, shouldValidate: true });
      form.setValue("uf", res.uf || "RJ", { shouldDirty: true, shouldValidate: true });
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [cep, form]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { imageFileToCompressedDataUrl } = await import("@/utils/image-compress");
      const dataUrl = await imageFileToCompressedDataUrl(file, {
        maxSide: 1024,
        quality: 0.82,
        outputType: "image/jpeg",
      });
      setPhotoPreview(dataUrl);
      form.setValue("photo", dataUrl);
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPhotoPreview(base64);
        form.setValue("photo", base64);
      };
      reader.readAsDataURL(file);
    }
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    const run = async () => {
      const finalBank = values.bank === "outro" ? values.customBank : values.bank;

      const payload: any = {
        ...values,
        bank: finalBank,
      };
      delete payload.customBank;

      if (initialData) {
        const before = { ...(initialData as CoordinatorRegistration) };
        const updated = updateGlobalCoordinator(initialData.id, payload) as CoordinatorRegistration;
        try {
          await upsertCoordinator(updated);
        } catch (e: any) {
          updateGlobalCoordinator(initialData.id, before);
          showError(e?.message || "Não foi possível salvar no Supabase.");
          return;
        }

        showSuccess("Cadastro atualizado!");

        const target = redirectTo === undefined ? "/coordenadores" : redirectTo;
        if (target !== null) navigate(target);
        return;
      }

      const created = createGlobalCoordinator(payload);
      try {
        await upsertCoordinator(created);
      } catch (e: any) {
        // rollback local
        try {
          const { deleteGlobalCoordinator } = await import("@/utils/coordinators");
          deleteGlobalCoordinator(created.id);
        } catch {
          // ignore
        }
        showError(e?.message || "Não foi possível salvar no Supabase.");
        return;
      }

      showSuccess("Cadastro realizado! Login e senha foram gerados.");
      onCompleted?.({ login: created.authLogin, password: created.authPassword });

      const target = redirectTo === undefined ? "/coordenadores" : redirectTo;
      if (target !== null) navigate(target);
    };

    void run();
  }

  const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
    <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
      <div className="bg-primary/10 p-2 rounded-xl">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="text-lg font-black text-primary uppercase tracking-tight">{title}</h3>
    </div>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-5xl mx-auto pb-20">
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="relative group">
            <div className="w-32 h-32 rounded-[2.5rem] bg-slate-100 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <User className="h-12 w-12 text-slate-300" />
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-xl cursor-pointer shadow-lg hover:scale-110 transition-transform">
              <Camera className="h-4 w-4" />
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </label>
          </div>
          <p className="text-xs font-bold text-slate-400 mt-3 uppercase tracking-widest">Foto do Coordenador</p>
        </div>

        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem]">
          <CardContent className="p-8">
            <SectionHeader icon={User} title="1. Dados Gerais" />
            <div className="grid gap-6 md:grid-cols-3">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem className="md:col-span-3">
                    <FormLabel className="font-bold">Nome Completo / Razão Social *</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">CPF</FormLabel>
                    <FormControl>
                      <Input placeholder="000.000.000-00" {...field} className="rounded-xl" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">RG</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-xl" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">CNPJ (caso Pessoa Jurídica)</FormLabel>
                    <FormControl>
                      <Input placeholder="00.000.000/0000-00" {...field} className="rounded-xl" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="font-bold">E-mail *</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cellPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Celular *</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem className="md:col-span-3">
                    <FormLabel className="font-bold">Gênero *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex gap-8 mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Feminino" id="f" />
                          <label htmlFor="f">Feminino</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Masculino" id="m" />
                          <label htmlFor="m">Masculino</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Outro" id="o" />
                          <label htmlFor="o">Outro</label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem]">
          <CardContent className="p-8">
            <SectionHeader icon={MapPin} title="2. Endereço" />
            <div className="grid gap-6 md:grid-cols-4">
              <FormField
                control={form.control}
                name="cep"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">CEP *</FormLabel>
                    <FormControl>
                      <Input placeholder="00000-000" {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="street"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="font-bold">Logradouro *</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Número *</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="complement"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="font-bold">Complemento</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-xl" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="neighborhood"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Bairro *</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormItem>
                  <FormLabel className="font-bold">Cidade</FormLabel>
                  <Input value={form.watch("city")} disabled className="rounded-xl bg-slate-50" />
                </FormItem>
                <FormItem>
                  <FormLabel className="font-bold">UF</FormLabel>
                  <Input value={form.watch("uf")} disabled className="rounded-xl bg-slate-50" />
                </FormItem>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem]">
          <CardContent className="p-8">
            <SectionHeader icon={Landmark} title="3. Dados Bancários *" />
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="bank"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Banco *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Selecione o banco" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BRAZILIAN_BANKS.map((bank) => (
                          <SelectItem key={bank} value={bank}>
                            {bank}
                          </SelectItem>
                        ))}
                        <SelectItem value="outro" className="font-bold text-primary">
                          + Outro (Digitar manualmente)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isCustomBank && (
                <FormField
                  control={form.control}
                  name="customBank"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Nome do Banco</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o banco" {...field} className="rounded-xl" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="agency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Agência *</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="account"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Conta *</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pixKey"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="font-bold">Chave PIX *</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl px-8 h-12 font-bold"
            onClick={() => navigate("/coordenadores")}
          >
            Cancelar
          </Button>
          <Button type="submit" className="rounded-2xl px-10 h-12 font-black shadow-lg shadow-primary/20">
            Salvar
          </Button>
        </div>
      </form>
    </Form>
  );
}