import { supabase } from "@/integrations/supabase/client";
import { getTeacherSessionLogin, getTeacherSessionPassword } from "@/utils/teacher-auth";
import { getCoordinatorSessionLogin, getCoordinatorSessionPassword } from "@/utils/coordinator-auth";

export type WaitlistStatus = "aguardando" | "chamado" | "matriculado" | "desistiu";

export type WaitlistEntry = {
  id: string;
  classId: string;
  studentId: string;
  createdAt: string;
  status: WaitlistStatus;
  calledAt?: string | null;
  note?: string | null;
  // dados de contato (vêm da ficha do aluno)
  fullName: string;
  socialName?: string | null;
  email?: string | null;
  cellPhone?: string | null;
  birthDate?: string | null;
  age?: number | null;
};

type ModeBStaff = { login: string; password: string };

function getModeBStaff(): ModeBStaff | null {
  const tLogin = getTeacherSessionLogin();
  const tPw = getTeacherSessionPassword();
  if (tLogin && tPw) return { login: tLogin, password: tPw };

  const cLogin = getCoordinatorSessionLogin();
  const cPw = getCoordinatorSessionPassword();
  if (cLogin && cPw) return { login: cLogin, password: cPw };

  return null;
}

// Ordem de exibição: quem ainda não foi chamado fica em cima (mais evidente).
// Ao ser "chamado", a pessoa vai para o fim da fila ativa. Dentro de cada
// status mantém FIFO (created_at crescente).
const STATUS_RANK: Record<WaitlistStatus, number> = {
  aguardando: 0,
  chamado: 1,
  matriculado: 2,
  desistiu: 3,
};

function sortWaitlist(list: WaitlistEntry[]): WaitlistEntry[] {
  return [...list].sort((a, b) => {
    const ra = STATUS_RANK[a.status] ?? 99;
    const rb = STATUS_RANK[b.status] ?? 99;
    if (ra !== rb) return ra - rb;
    return (a.createdAt || "").localeCompare(b.createdAt || "");
  });
}

function mapRow(r: any): WaitlistEntry {
  const s = r.students ?? r; // direto (admin join) ou flat (RPC)
  return {
    id: r.id,
    classId: r.class_id,
    studentId: r.student_id,
    createdAt: r.created_at,
    status: r.status,
    calledAt: r.called_at ?? null,
    note: r.note ?? null,
    fullName: s.full_name,
    socialName: s.social_name ?? null,
    email: s.email ?? null,
    cellPhone: s.cell_phone ?? null,
    birthDate: s.birth_date ?? null,
    age: s.age ?? null,
  };
}

export async function fetchWaitlistRemote(classId: string): Promise<WaitlistEntry[]> {
  if (!supabase) return [];

  const staff = getModeBStaff();
  if (staff) {
    const { data, error } = await supabase.rpc("mode_b_list_waitlist", {
      p_login: staff.login,
      p_password: staff.password,
      p_class_id: classId,
    });
    if (error || !data) return [];
    return sortWaitlist((data as any[]).map(mapRow));
  }

  const { data, error } = await supabase
    .from("class_waitlist")
    .select(
      "id,class_id,student_id,created_at,status,called_at,note,students(full_name,social_name,email,cell_phone,birth_date,age)"
    )
    .eq("class_id", classId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return sortWaitlist((data as any[]).map(mapRow));
}

export async function addToWaitlistRemote(classId: string, studentId: string): Promise<void> {
  if (!supabase) return;

  const staff = getModeBStaff();
  if (staff) {
    const { error } = await supabase.rpc("mode_b_add_waitlist", {
      p_login: staff.login,
      p_password: staff.password,
      p_class_id: classId,
      p_student_id: studentId,
    });
    if (error) throw error;
    return;
  }

  // Admin: evita duplicar na fila ativa, depois insere.
  const { data: existing } = await supabase
    .from("class_waitlist")
    .select("id")
    .eq("class_id", classId)
    .eq("student_id", studentId)
    .in("status", ["aguardando", "chamado"])
    .maybeSingle();
  if (existing) return;

  const { error } = await supabase
    .from("class_waitlist")
    .insert({ class_id: classId, student_id: studentId });
  if (error) throw error;
}

export async function updateWaitlistStatusRemote(
  id: string,
  status: WaitlistStatus
): Promise<void> {
  if (!supabase) return;

  const staff = getModeBStaff();
  if (staff) {
    const { error } = await supabase.rpc("mode_b_update_waitlist_status", {
      p_login: staff.login,
      p_password: staff.password,
      p_waitlist_id: id,
      p_status: status,
    });
    if (error) throw error;
    return;
  }

  const patch: Record<string, unknown> = { status };
  if (status === "chamado") patch.called_at = new Date().toISOString();
  const { error } = await supabase.from("class_waitlist").update(patch).eq("id", id);
  if (error) throw error;
}

export async function removeFromWaitlistRemote(id: string): Promise<void> {
  if (!supabase) return;

  const staff = getModeBStaff();
  if (staff) {
    const { error } = await supabase.rpc("mode_b_remove_waitlist", {
      p_login: staff.login,
      p_password: staff.password,
      p_waitlist_id: id,
    });
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("class_waitlist").delete().eq("id", id);
  if (error) throw error;
}

/** Promove para vaga: cria/reativa matrícula e marca a fila como matriculado. */
export async function promoteFromWaitlistRemote(
  id: string,
  classId: string,
  studentId: string
): Promise<void> {
  if (!supabase) return;

  const staff = getModeBStaff();
  if (staff) {
    const { error } = await supabase.rpc("mode_b_promote_waitlist", {
      p_login: staff.login,
      p_password: staff.password,
      p_waitlist_id: id,
    });
    if (error) throw error;
    return;
  }

  // Admin: reativa se já existe matrícula, senão cria; depois marca a fila.
  const { data: existing } = await supabase
    .from("class_student_enrollments")
    .select("class_id,student_id")
    .eq("class_id", classId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("class_student_enrollments")
      .update({ removed_at: null })
      .eq("class_id", classId)
      .eq("student_id", studentId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("class_student_enrollments").insert({
      class_id: classId,
      student_id: studentId,
      enrolled_at: new Date().toISOString(),
      removed_at: null,
    });
    if (error) throw error;
  }

  const { error: upErr } = await supabase
    .from("class_waitlist")
    .update({ status: "matriculado" })
    .eq("id", id);
  if (upErr) throw upErr;
}
