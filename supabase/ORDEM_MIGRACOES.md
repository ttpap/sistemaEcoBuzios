# Ordem de migrações (Supabase) — EcoBúzios

Objetivo: deixar claro **o mínimo** necessário para o sistema funcionar e o que é opcional.

> Regra: se você não sabe o que rodar, rode **(A) + (B)**.

---

## (A) Base (obrigatório)

1. `supabase/migrations/0001_init.sql`
   - Cria tabelas
   - Cria `profiles` + roles
   - Ativa RLS e cria policies

---

## (B) Modo B (obrigatório para professor/coordenador/aluno via login/senha)

Rode na ordem:

1. `0007_mode_b_rpcs_all.sql`
2. `0008_mode_b_upsert_student.sql`
3. `0010_mode_b_coordinator_classes_rule.sql`
4. `0018_mode_b_list_projects.sql`

---

## Admin sem dor (recomendado)

- `0019_admin_local_bootstrap_admin.sql`
  - Cria uma RPC que promove automaticamente o usuário autenticado (email do admin local)
    para `profiles.role='admin'`.

---

## Opcionais (conforme funcionalidade)

- `0009_students_allow_update_self.sql` — aluno editar própria ficha (quando usar Auth para aluno)
- `0011_students_guardian_declaration.sql` — campo declaração do responsável
- `0013_teacher_assignments_coordinator_access.sql` — coordenador gerenciar alocações de professor
- `0016_enel_report_rpc.sql` — relatório ENEL

---

## Dica de diagnóstico

- Abra `.../db-status` para ver a URL do Supabase e se está vindo de RUNTIME/VARS/FALLBACK.
- No app: Admin → Supabase (`/supabase`) para configurar URL/anon key e testar conexão.
