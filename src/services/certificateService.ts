import { supabase } from "@/integrations/supabase/client";
import type { CertificateConfig } from "@/types/certificate";

const DEFAULT_CONFIG: Omit<CertificateConfig, "project_id"> = {
  text_template: "",
  border_color: "#C9A84C",
  border_style: "solid",
  logo_top: "",
  logo_bottom: "",
  signatures_count: 4,
  signatures: [],
  font_family: "times",
  font_size: 14,
};

export const certificateService = {
  async getByProject(projectId: string): Promise<CertificateConfig | null> {
    const { data, error } = await supabase
      .from("certificate_configs")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      project_id: data.project_id,
      text_template: data.text_template ?? "",
      border_color: data.border_color ?? "#C9A84C",
      border_style: (data.border_style as "solid" | "double") ?? "solid",
      logo_top: data.logo_top ?? "",
      logo_bottom: data.logo_bottom ?? "",
      signatures_count: data.signatures_count ?? 4,
      font_family: (data.font_family as any) ?? "times",
      font_size: data.font_size ?? 14,
      signatures: ((data.signatures as any) ?? []).map((s: any) => ({
        name: s?.name ?? "",
        title: s?.title ?? "",
        image: s?.image ?? "",
      })),
    };
  },

  async save(config: CertificateConfig): Promise<void> {
    const row = {
      project_id: config.project_id,
      text_template: config.text_template,
      border_color: config.border_color,
      border_style: config.border_style,
      logo_top: config.logo_top,
      logo_bottom: config.logo_bottom,
      signatures_count: config.signatures_count,
      signatures: config.signatures,
      font_family: config.font_family,
      font_size: config.font_size,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("certificate_configs")
      .upsert(row, { onConflict: "project_id" });

    if (error) throw error;
  },

  getDefault(projectId: string): CertificateConfig {
    return { ...DEFAULT_CONFIG, project_id: projectId };
  },
};
