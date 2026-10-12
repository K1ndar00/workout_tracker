-- Workout Tracker: one document table shared by the web and mobile apps.
-- Each row is a JSON document owned by one user. `collection` is one of
-- 'workouts' | 'plans' | 'nutrition' | 'settings'; `key` is the document id
-- (the date for nutrition logs, 'settings' for the settings document).

create table if not exists public.documents (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  collection text        not null check (collection in ('workouts', 'plans', 'nutrition', 'settings')),
  key        text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, collection, key)
);

alter table public.documents enable row level security;

create policy "documents_select_own" on public.documents
  for select using (auth.uid() = user_id);
create policy "documents_insert_own" on public.documents
  for insert with check (auth.uid() = user_id);
create policy "documents_update_own" on public.documents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "documents_delete_own" on public.documents
  for delete using (auth.uid() = user_id);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger documents_touch_updated_at
  before update on public.documents
  for each row execute function public.touch_updated_at();

-- Realtime: lets one device notify the other when data changes.
alter publication supabase_realtime add table public.documents;
