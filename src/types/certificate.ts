export type CertificateSignature = {
  name: string;
  title: string;
  image: string; // base64 data URL
};

export type CertificateConfig = {
  id?: string;
  project_id: string;
  text_template: string;
  border_color: string;
  border_style: "solid" | "double";
  logo_top: string;
  logo_bottom: string;
  signatures_count: number;
  signatures: CertificateSignature[];
  font_family: "times" | "helvetica" | "courier";
  font_size: number;
};

export type CertificateEmitData = {
  config: CertificateConfig;
  studentName: string;
  periodStart: string;
  periodEnd: string;
  workload: string;
  customText: string;
};
