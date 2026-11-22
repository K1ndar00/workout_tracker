-- Remove the nutrition feature: delete its data and stop allowing its collections.
-- WARNING: this permanently deletes every 'nutrition' and 'settings' row for ALL users.
-- Run it manually in the Supabase SQL Editor once you are sure that data is not needed.

delete from public.documents where collection in ('nutrition', 'settings');

alter table public.documents drop constraint if exists documents_collection_check;
alter table public.documents
  add constraint documents_collection_check check (collection in ('workouts', 'plans'));
