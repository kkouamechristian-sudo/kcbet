-- A coller une seule fois dans Supabase : SQL Editor > New query > Run.
-- Cree la table du journal de paris ; chaque visiteur connecte ne voit et ne modifie que ses propres lignes.
create table if not exists public.journal (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.journal enable row level security;
drop policy if exists "chacun ses paris" on public.journal;
create policy "chacun ses paris" on public.journal
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
