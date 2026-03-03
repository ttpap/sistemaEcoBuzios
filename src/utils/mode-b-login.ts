import { supabase } from "@/integrations/supabase/client";
import { getActiveProjectId } from "@/utils/projects";
import { DEFAULT_STUDENT_PASSWORD, getStudentLoginFromRegistration } from "@/utils/student-auth";

export type ModeBLoginResult =
  | { ok: true; role: "admin"; redirectTo: string }
  | { ok: true; role: "teacher"; redirectTo: string }
  | { ok: true; role: "coordinator"; redirectTo: string }
  | { ok: true; role: "student"; redirectTo: string }
  | { ok: false; reason: "invalid_credentials" | "not_assigned" | "ambiguous_login" };

function normalizePassword(pw: string) {
  return (pw || "").toLowerCase().replace(/\s+/g, "");
}

function clearModeBSessions() {
  localStorage.removeItem("ecobuzios_teacher_session");
  localStorage.removeItem("ecobuzios_coordinator_session");
  localStorage.removeItem("ecobuzios_student_session");
}

export async function modeBLogin(input: {
  login: string;
  password: string;
}): Promise<ModeBLoginResult> {
  const loginRaw = (input.login || "").trim();
  const passwordRaw = (input.password || "").trim();

  if (!loginRaw || !passwordRaw) return { ok: false, reason: "invalid_credentials" };

  // Garante que não exista sessão antiga que faça gates liberarem/negarem incorretamente.
  clearModeBSessions();

  // 1) Tenta Admin (Supabase Auth) quando parece email.
  if (loginRaw.includes("@")) {
    const { error } = await supabase.auth.signInWithPassword({
      email: loginRaw,
      password: passwordRaw,
    });

    if (!error) {
      return { ok: true, role: "admin", redirectTo: "/" };
    }
    // Se falhar, continua tentando como credencial (pode ser um login com @ no staff, raro).
  }

  // 2) Tenta staff (coordenador/professor) via RPC.
  const { data: staff, error: staffErr } = await supabase.rpc("mode_b_login_staff", {
    p_login: loginRaw,
    p_password: passwordRaw,
  });

  if (!staffErr && Array.isArray(staff) && staff.length > 0) {
    const row = staff[0] as any;
    const role = String(row.role || "") as "teacher" | "coordinator";
    const personId = String(row.person_id || "");
    const projectIds = Array.from(new Set(((row.project_ids as any[]) || []).map(String))).filter(Boolean);

    if (role === "teacher") {
      localStorage.setItem(
        "ecobuzios_teacher_session",
        JSON.stringify({ teacherId: personId, projectIds }),
      );

      const preferred = getActiveProjectId();
      if (projectIds.length === 1) {
        localStorage.setItem(
          "ecobuzios_teacher_session",
          JSON.stringify({ teacherId: personId, projectIds, projectId: projectIds[0] }),
        );
        return { ok: true, role: "teacher", redirectTo: "/professor" };
      }

      if (preferred && projectIds.includes(preferred)) {
        localStorage.setItem(
          "ecobuzios_teacher_session",
          JSON.stringify({ teacherId: personId, projectIds, projectId: preferred }),
        );
        return { ok: true, role: "teacher", redirectTo: "/professor" };
      }

      return {
        ok: true,
        role: "teacher",
        redirectTo: projectIds.length > 1 ? "/professor/selecionar-projeto" : "/professor",
      };
    }

    if (role === "coordinator") {
      localStorage.setItem(
        "ecobuzios_coordinator_session",
        JSON.stringify({ coordinatorId: personId, projectIds }),
      );

      const preferred = getActiveProjectId();
      if (projectIds.length === 1) {
        localStorage.setItem(
          "ecobuzios_coordinator_session",
          JSON.stringify({ coordinatorId: personId, projectIds, projectId: projectIds[0] }),
        );
        return { ok: true, role: "coordinator", redirectTo: "/coordenador" };
      }

      if (preferred && projectIds.includes(preferred)) {
        localStorage.setItem(
          "ecobuzios_coordinator_session",
          JSON.stringify({ coordinatorId: personId, projectIds, projectId: preferred }),
        );
        return { ok: true, role: "coordinator", redirectTo: "/coordenador" };
      }

      return {
        ok: true,
        role: "coordinator",
        redirectTo: projectIds.length > 1 ? "/coordenador/selecionar-projeto" : "/coordenador",
      };
    }

    return { ok: false, reason: "invalid_credentials" };
  }

  // 3) Tenta aluno via RPC. Permite matrícula completa ou só 4 dígitos.
  const registrationOrLast4 = loginRaw.includes("-") ? loginRaw : getStudentLoginFromRegistration(loginRaw);

  // Compat: senha do aluno é fixa, mas deixamos o usuário digitar.
  const studentPw = normalizePassword(passwordRaw);
  if (studentPw !== normalizePassword(DEFAULT_STUDENT_PASSWORD)) {
    return { ok: false, reason: "invalid_credentials" };
  }

  const { data: student, error: studentErr } = await supabase.rpc("mode_b_login_student", {
    p_registration_or_last4: registrationOrLast4,
    p_password: DEFAULT_STUDENT_PASSWORD,
  });

  if (studentErr || !Array.isArray(student) || student.length === 0) {
    return { ok: false, reason: "invalid_credentials" };
  }

  const srow = student[0] as any;
  if (srow.reason === "ambiguous_login") return { ok: false, reason: "ambiguous_login" };
  if (srow.reason === "invalid_credentials") return { ok: false, reason: "invalid_credentials" };

  const studentId = String(srow.student_id || "");
  const projectIds = Array.from(new Set(((srow.project_ids as any[]) || []).map(String))).filter(Boolean);
  if (!studentId) return { ok: false, reason: "invalid_credentials" };
  if (!projectIds.length) return { ok: false, reason: "not_assigned" };

  localStorage.setItem("ecobuzios_student_session", JSON.stringify({ studentId, projectIds }));

  const preferred = getActiveProjectId();
  if (projectIds.length === 1) {
    localStorage.setItem(
      "ecobuzios_student_session",
      JSON.stringify({ studentId, projectIds, projectId: projectIds[0] }),
    );
    return { ok: true, role: "student", redirectTo: "/aluno" };
  }

  if (preferred && projectIds.includes(preferred)) {
    localStorage.setItem(
      "ecobuzios_student_session",
      JSON.stringify({ studentId, projectIds, projectId: preferred }),
    );
    return { ok: true, role: "student", redirectTo: "/aluno" };
  }

  return { ok: true, role: "student", redirectTo: "/aluno/selecionar-projeto" };
}