-- Plano B (parte 3): trigger move a foto para student_photos em TODA gravação
-- (mantém students.photo sempre vazio, sem mexer no código de salvar cadastro)
-- e zera as fotos existentes. A partir daqui students.* é leve para todos os
-- clientes — fim dos timeouts intermitentes por payload de fotos (30MB).
-- Aplicar SOMENTE após o deploy do código que lê de student_photos (commit ca88ce6).

create or replace function public.move_student_photo()
returns trigger language plpgsql security definer set search_path to 'public'
as $function$
begin
  insert into public.student_photos(student_id, photo, updated_at)
  values (NEW.id, NEW.photo, now())
  on conflict (student_id) do update set photo = excluded.photo, updated_at = now();
  update public.students set photo = null where id = NEW.id;
  return null;
end;
$function$;

drop trigger if exists trg_move_student_photo on public.students;
create trigger trg_move_student_photo
  after insert or update of photo on public.students
  for each row
  when (NEW.photo is not null and NEW.photo <> '')
  execute function public.move_student_photo();

update public.students set photo = null where photo is not null;
