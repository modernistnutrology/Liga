-- Liga Village Padel — estado compartilhado do app.
-- Rode uma vez em: Supabase → SQL Editor → New query → colar → Run.

create table if not exists public.app_estado (
  id text primary key,
  dados jsonb not null,
  atualizado_em timestamptz not null default now()
);

alter table public.app_estado enable row level security;

-- Qualquer pessoa com o app pode ler.
drop policy if exists "leitura publica" on public.app_estado;
create policy "leitura publica" on public.app_estado
  for select to anon, authenticated using (true);

-- Só usuários logados (administradores criados por você no painel) podem gravar.
drop policy if exists "admin insere" on public.app_estado;
create policy "admin insere" on public.app_estado
  for insert to authenticated with check (true);

drop policy if exists "admin atualiza" on public.app_estado;
create policy "admin atualiza" on public.app_estado
  for update to authenticated using (true) with check (true);

-- Avisa os aparelhos em tempo real quando os dados mudam.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'app_estado'
  ) then
    alter publication supabase_realtime add table public.app_estado;
  end if;
end $$;
