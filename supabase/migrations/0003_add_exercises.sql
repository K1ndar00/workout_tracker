-- Allow the 'exercises' collection (user-added exercise master entries).
-- Run 0002_remove_nutrition.sql first (if you have not yet), then this file.
-- Run this BEFORE using the app version that has the exercise master: until then, syncing fails
-- because the server rejects the new collection.

alter table public.documents drop constraint if exists documents_collection_check;
alter table public.documents
  add constraint documents_collection_check check (collection in ('workouts', 'plans', 'exercises'));
