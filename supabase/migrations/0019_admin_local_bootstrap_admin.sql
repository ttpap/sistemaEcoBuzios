-- Permite bootstrap automático do perfil admin para o email do admin local.
-- Uso: após autenticar no Supabase Auth com o email do admin, chame:
--   select public.admin_local_bootstrap_admin('SENHA_DO_ADMIN');
-- Isso cria/atualiza public.profiles com role=admin para auth.uid().

create or replace function public.admin_local_bootstrap_admin(p_admin_password text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if auth.uid() is null then
    return false;
  end if;

  select u.email into v_email
  from auth.users u
  where u.id = auth.uid();

  if v_email is null then
    return false;
  end if;

  -- Hard-coded admin local email
  if lower(v_email) <> lower('antonpap@gmail.com') then
    return false;
  end if;

  -- Hard-coded admin local password (mesmo do app)
  if p_admin_password <> 'aNtonio4500' then
    return false;
  end if;

  insert into public.profiles (user_id, role, full_name)
  values (auth.uid(), 'admin', 'Administrador')
  on conflict (user_id)
  do update set
    role = 'admin',
    full_name = coalesce(public.profiles.full_name, excluded.full_name);

  return true;
end;
$$;

grant execute on function public.admin_local_bootstrap_admin(text) to authenticated;
