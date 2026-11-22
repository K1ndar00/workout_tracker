-- One-time copy of the old JSON `documents` rows into the normalized tables (0002).
-- Safe to run more than once (rows are keyed by ids derived from the old ones). `documents` is NOT
-- modified or deleted, so you can compare the result and roll back by dropping the new tables.
--
-- Rules:
--   * nutrition / settings documents are ignored (the feature was removed).
--   * An exercise name (ignoring case and surrounding spaces) that matches a built-in exercise is
--     linked to it. Any other name becomes the user's own exercise with part 'unclassified'.
--   * exercise rows with an empty name are dropped (together with their sets).
--
-- Run it in the Supabase SQL Editor (it runs with full rights, so RLS does not get in the way).

begin;

-- 1) every exercise name used in old workouts and plans
create temp table _names on commit drop as
select d.user_id, btrim(e ->> 'name') as name
  from public.documents d
  cross join lateral jsonb_array_elements(coalesce(d.data -> 'exercises', '[]'::jsonb)) e
 where d.collection = 'workouts'
union
select d.user_id, btrim(e ->> 'name')
  from public.documents d
  cross join lateral jsonb_array_elements(coalesce(d.data -> 'days', '[]'::jsonb)) day
  cross join lateral jsonb_array_elements(coalesce(day -> 'exercises', '[]'::jsonb)) e
 where d.collection = 'plans';

-- 2) the user's own exercises (skip blanks and names that already exist as built-in or own)
insert into public.exercises (user_id, name, part)
select distinct on (n.user_id, lower(n.name)) n.user_id, n.name, 'unclassified'
  from _names n
 where n.name <> ''
   and not exists (
         select 1 from public.exercises e
          where lower(btrim(e.name)) = lower(n.name) and (e.user_id is null or e.user_id = n.user_id))
 order by n.user_id, lower(n.name);

-- 3) resolver: (user, lower(name)) -> exercise id, built-in or own
create temp view _ex as
select u.user_id, lower(btrim(e.name)) as lname, e.id
  from (select distinct user_id from public.documents) u
  join public.exercises e on e.user_id is null or e.user_id = u.user_id;

-- 4) workouts
insert into public.workouts (id, user_id, title, date, emoji, notes, created_at)
select md5(d.user_id || '/workouts/' || d.key)::uuid, d.user_id,
       coalesce(d.data ->> 'title', ''), (d.data ->> 'date')::date,
       coalesce(d.data ->> 'emoji', '🏋️'), coalesce(d.data ->> 'notes', ''),
       coalesce((d.data ->> 'createdAt')::timestamptz, now())
  from public.documents d
 where d.collection = 'workouts'
on conflict (id) do nothing;

insert into public.workout_exercises (id, user_id, workout_id, exercise_id, position)
select md5(d.user_id || '/we/' || d.key || '/' || (t.e ->> 'id'))::uuid, d.user_id,
       md5(d.user_id || '/workouts/' || d.key)::uuid, x.id, t.ord - 1
  from public.documents d
  cross join lateral jsonb_array_elements(coalesce(d.data -> 'exercises', '[]'::jsonb)) with ordinality as t (e, ord)
  join _ex x on x.user_id = d.user_id and x.lname = lower(btrim(t.e ->> 'name'))
 where d.collection = 'workouts'
on conflict (id) do nothing;

insert into public.workout_sets (id, user_id, workout_exercise_id, position, weight, reps, unit, completed)
select md5(d.user_id || '/ws/' || d.key || '/' || (e ->> 'id') || '/' || (t.s ->> 'id'))::uuid, d.user_id,
       md5(d.user_id || '/we/' || d.key || '/' || (e ->> 'id'))::uuid, t.sord - 1,
       greatest(coalesce((t.s ->> 'weight')::numeric, 0), 0), greatest(coalesce((t.s ->> 'reps')::int, 0), 0),
       case when t.s ->> 'unit' = 'lbs' then 'lbs' else 'kg' end, coalesce((t.s ->> 'completed')::boolean, false)
  from public.documents d
  cross join lateral jsonb_array_elements(coalesce(d.data -> 'exercises', '[]'::jsonb)) e
  cross join lateral jsonb_array_elements(coalesce(e -> 'sets', '[]'::jsonb)) with ordinality as t (s, sord)
 where d.collection = 'workouts'
   -- skip sets of exercises that were dropped (empty name)
   and exists (select 1 from public.workout_exercises we
                where we.id = md5(d.user_id || '/we/' || d.key || '/' || (e ->> 'id'))::uuid)
on conflict (id) do nothing;

-- 5) plans
insert into public.plans (id, user_id, name, emoji, description, frequency, is_active, created_at)
select md5(d.user_id || '/plans/' || d.key)::uuid, d.user_id,
       coalesce(d.data ->> 'name', ''), coalesce(d.data ->> 'emoji', '🗓️'), coalesce(d.data ->> 'description', ''),
       least(greatest(coalesce((d.data ->> 'frequency')::int, 3), 1), 7),
       coalesce((d.data ->> 'isActive')::boolean, false), coalesce((d.data ->> 'createdAt')::timestamptz, now())
  from public.documents d
 where d.collection = 'plans'
on conflict (id) do nothing;

insert into public.plan_days (id, user_id, plan_id, label, position)
select md5(d.user_id || '/pd/' || d.key || '/' || (t.day ->> 'id'))::uuid, d.user_id,
       md5(d.user_id || '/plans/' || d.key)::uuid, coalesce(t.day ->> 'label', ''), t.ord - 1
  from public.documents d
  cross join lateral jsonb_array_elements(coalesce(d.data -> 'days', '[]'::jsonb)) with ordinality as t (day, ord)
 where d.collection = 'plans'
on conflict (id) do nothing;

insert into public.plan_exercises (id, user_id, plan_day_id, exercise_id, position, sets, reps, weight)
select md5(d.user_id || '/pe/' || d.key || '/' || (day ->> 'id') || '/' || (t.e ->> 'id'))::uuid, d.user_id,
       md5(d.user_id || '/pd/' || d.key || '/' || (day ->> 'id'))::uuid, x.id, t.eord - 1,
       greatest(coalesce((t.e ->> 'sets')::int, 3), 1), coalesce(t.e ->> 'reps', '10'),
       nullif(t.e ->> 'weight', '')::numeric
  from public.documents d
  cross join lateral jsonb_array_elements(coalesce(d.data -> 'days', '[]'::jsonb)) day
  cross join lateral jsonb_array_elements(coalesce(day -> 'exercises', '[]'::jsonb)) with ordinality as t (e, eord)
  join _ex x on x.user_id = d.user_id and x.lname = lower(btrim(t.e ->> 'name'))
 where d.collection = 'plans'
on conflict (id) do nothing;

drop view _ex;

commit;

-- Check the result (compare with what you expect):
--   select (select count(*) from documents where collection = 'workouts') as old_workouts,
--          (select count(*) from workouts) as new_workouts;
--   select part, count(*) from exercises where user_id is not null group by part;
