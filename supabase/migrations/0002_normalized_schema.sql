-- Normalized schema: replaces the single JSON `documents` table (0001) for new data.
-- `documents` is kept untouched until the migration (0003) has been checked.
--
--   exercises ◄── workout_exercises ◄── workout_sets
--                      ▲
--                  workouts
--   exercises ◄── plan_exercises ◄── plan_days ◄── plans
--
-- Every table has user_id (default auth.uid()) and one RLS policy: you only see your own rows.
-- `exercises` is the exception: rows with user_id NULL are built-in and readable by everyone.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.exercises (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete cascade default auth.uid(), -- NULL = built-in
  name       text not null check (length(btrim(name)) > 0),
  part       text not null check (part in ('shoulder', 'chest', 'arm', 'abs', 'back', 'leg', 'unclassified')),
  created_at timestamptz not null default now()
);
-- Same name (ignoring case/spaces) only once per user; built-ins (NULL user) form their own group.
create unique index exercises_unique_name
  on public.exercises (coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(btrim(name)));

create table public.workouts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title      text not null default '',
  date       date not null,
  emoji      text not null default '🏋️',
  notes      text not null default '',
  created_at timestamptz not null default now()
);
create index workouts_user_date on public.workouts (user_id, date desc);

create table public.workout_exercises (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade default auth.uid(),
  workout_id  uuid not null references public.workouts (id) on delete cascade,
  -- restrict: an exercise used in any record cannot be deleted (the database enforces it).
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position    int  not null
);
create index workout_exercises_workout on public.workout_exercises (workout_id);
create index workout_exercises_exercise on public.workout_exercises (exercise_id);

create table public.workout_sets (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade default auth.uid(),
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  position            int  not null,
  weight              numeric(7, 2) not null default 0 check (weight >= 0),
  reps                int  not null default 0 check (reps >= 0),
  unit                text not null default 'kg' check (unit in ('kg', 'lbs')),
  completed           boolean not null default false
);
create index workout_sets_exercise on public.workout_sets (workout_exercise_id);

create table public.plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name        text not null default '',
  emoji       text not null default '🗓️',
  description text not null default '',
  frequency   int  not null default 3 check (frequency between 1 and 7),
  is_active   boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.plan_days (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users (id) on delete cascade default auth.uid(),
  plan_id  uuid not null references public.plans (id) on delete cascade,
  label    text not null default '',
  position int  not null
);
create index plan_days_plan on public.plan_days (plan_id);

create table public.plan_exercises (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade default auth.uid(),
  plan_day_id uuid not null references public.plan_days (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position    int  not null,
  sets        int  not null default 3 check (sets >= 1),
  reps        text not null default '10',
  weight      numeric(7, 2)
);
create index plan_exercises_day on public.plan_exercises (plan_day_id);
create index plan_exercises_exercise on public.plan_exercises (exercise_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.exercises         enable row level security;
alter table public.workouts          enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets      enable row level security;
alter table public.plans             enable row level security;
alter table public.plan_days         enable row level security;
alter table public.plan_exercises    enable row level security;

-- Built-in exercises (user_id is NULL) are readable by everyone but can never be changed from the app.
create policy exercises_select on public.exercises for select using (user_id is null or user_id = auth.uid());
create policy exercises_insert on public.exercises for insert with check (user_id = auth.uid());
create policy exercises_update on public.exercises for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy exercises_delete on public.exercises for delete using (user_id = auth.uid());

create policy workouts_own          on public.workouts          for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy workout_exercises_own on public.workout_exercises for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy workout_sets_own      on public.workout_sets      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy plans_own             on public.plans             for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy plan_days_own         on public.plan_days         for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy plan_exercises_own    on public.plan_exercises    for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Built-in exercises. The id is derived from the slug so a migration can find them again.
-- ---------------------------------------------------------------------------

insert into public.exercises (id, user_id, name, part)
select md5('default:' || slug)::uuid, null, name, part
from (values
  ('bench-press', 'ベンチプレス', 'chest'), ('dumbbell-press', 'ダンベルプレス', 'chest'),
  ('dumbbell-fly', 'ダンベルフライ', 'chest'), ('dips', 'ディップス', 'chest'), ('push-up', '腕立て伏せ', 'chest'),
  ('deadlift', 'デッドリフト', 'back'), ('lat-pulldown', 'ラットプルダウン', 'back'), ('pull-up', '懸垂', 'back'),
  ('bent-over-row', 'ベントオーバーロウ', 'back'), ('seated-row', 'シーテッドロウ', 'back'),
  ('shoulder-press', 'ショルダープレス', 'shoulder'), ('side-raise', 'サイドレイズ', 'shoulder'),
  ('front-raise', 'フロントレイズ', 'shoulder'), ('rear-raise', 'リアレイズ', 'shoulder'),
  ('upright-row', 'アップライトロウ', 'shoulder'),
  ('barbell-curl', 'バーベルカール', 'arm'), ('dumbbell-curl', 'ダンベルカール', 'arm'),
  ('hammer-curl', 'ハンマーカール', 'arm'), ('triceps-extension', 'トライセプスエクステンション', 'arm'),
  ('cable-pushdown', 'ケーブルプッシュダウン', 'arm'),
  ('crunch', 'クランチ', 'abs'), ('leg-raise', 'レッグレイズ', 'abs'), ('plank', 'プランク', 'abs'),
  ('ab-roller', 'アブローラー', 'abs'),
  ('squat', 'スクワット', 'leg'), ('leg-press', 'レッグプレス', 'leg'), ('leg-extension', 'レッグエクステンション', 'leg'),
  ('leg-curl', 'レッグカール', 'leg'), ('lunge', 'ランジ', 'leg'), ('calf-raise', 'カーフレイズ', 'leg')
) as d (slug, name, part);

-- ---------------------------------------------------------------------------
-- Save a whole workout / plan in one call (one transaction).
-- The client sends the full tree as JSON; rows missing from the JSON are deleted.
-- Runs with the caller's rights (security invoker), so RLS still applies.
-- ---------------------------------------------------------------------------

create or replace function public.save_workout(p jsonb) returns void
language plpgsql security invoker set search_path = public as $$
declare
  wid uuid := (p ->> 'id')::uuid;
begin
  insert into workouts (id, title, date, emoji, notes)
  values (wid, coalesce(p ->> 'title', ''), (p ->> 'date')::date, coalesce(p ->> 'emoji', '🏋️'), coalesce(p ->> 'notes', ''))
  on conflict (id) do update
    set title = excluded.title, date = excluded.date, emoji = excluded.emoji, notes = excluded.notes;

  -- exercises: drop the ones no longer present, upsert the rest
  delete from workout_exercises
   where workout_id = wid
     and id not in (select (e ->> 'id')::uuid from jsonb_array_elements(p -> 'exercises') e);

  insert into workout_exercises (id, workout_id, exercise_id, position)
  select (e ->> 'id')::uuid, wid, (e ->> 'exerciseId')::uuid, ord - 1
    from jsonb_array_elements(p -> 'exercises') with ordinality as t (e, ord)
  on conflict (id) do update
    set workout_id = excluded.workout_id, exercise_id = excluded.exercise_id, position = excluded.position;

  -- sets (sets of deleted exercises are already gone through the cascade)
  delete from workout_sets s
   using workout_exercises we
   where s.workout_exercise_id = we.id
     and we.workout_id = wid
     and s.id not in (
       select (st ->> 'id')::uuid
         from jsonb_array_elements(p -> 'exercises') e, jsonb_array_elements(e -> 'sets') st
     );

  insert into workout_sets (id, workout_exercise_id, position, weight, reps, unit, completed)
  select (st ->> 'id')::uuid, (e ->> 'id')::uuid, sord - 1,
         coalesce((st ->> 'weight')::numeric, 0), coalesce((st ->> 'reps')::int, 0),
         coalesce(st ->> 'unit', 'kg'), coalesce((st ->> 'completed')::boolean, false)
    from jsonb_array_elements(p -> 'exercises') e,
         jsonb_array_elements(e -> 'sets') with ordinality as s2 (st, sord)
  on conflict (id) do update
    set workout_exercise_id = excluded.workout_exercise_id, position = excluded.position,
        weight = excluded.weight, reps = excluded.reps, unit = excluded.unit, completed = excluded.completed;
end;
$$;

create or replace function public.save_plan(p jsonb) returns void
language plpgsql security invoker set search_path = public as $$
declare
  pid uuid := (p ->> 'id')::uuid;
begin
  insert into plans (id, name, emoji, description, frequency, is_active)
  values (pid, coalesce(p ->> 'name', ''), coalesce(p ->> 'emoji', '🗓️'), coalesce(p ->> 'description', ''),
          coalesce((p ->> 'frequency')::int, 3), coalesce((p ->> 'isActive')::boolean, false))
  on conflict (id) do update
    set name = excluded.name, emoji = excluded.emoji, description = excluded.description,
        frequency = excluded.frequency, is_active = excluded.is_active;

  delete from plan_days
   where plan_id = pid
     and id not in (select (d ->> 'id')::uuid from jsonb_array_elements(p -> 'days') d);

  insert into plan_days (id, plan_id, label, position)
  select (d ->> 'id')::uuid, pid, coalesce(d ->> 'label', ''), ord - 1
    from jsonb_array_elements(p -> 'days') with ordinality as t (d, ord)
  on conflict (id) do update
    set plan_id = excluded.plan_id, label = excluded.label, position = excluded.position;

  delete from plan_exercises x
   using plan_days pd
   where x.plan_day_id = pd.id
     and pd.plan_id = pid
     and x.id not in (
       select (e ->> 'id')::uuid
         from jsonb_array_elements(p -> 'days') d, jsonb_array_elements(d -> 'exercises') e
     );

  insert into plan_exercises (id, plan_day_id, exercise_id, position, sets, reps, weight)
  select (e ->> 'id')::uuid, (d ->> 'id')::uuid, (e ->> 'exerciseId')::uuid, eord - 1,
         coalesce((e ->> 'sets')::int, 3), coalesce(e ->> 'reps', '10'), (e ->> 'weight')::numeric
    from jsonb_array_elements(p -> 'days') d,
         jsonb_array_elements(d -> 'exercises') with ordinality as t2 (e, eord)
  on conflict (id) do update
    set plan_day_id = excluded.plan_day_id, exercise_id = excluded.exercise_id, position = excluded.position,
        sets = excluded.sets, reps = excluded.reps, weight = excluded.weight;
end;
$$;

-- ---------------------------------------------------------------------------
-- Flat view for the progress screen and for analysis (SQL / Python).
-- security_invoker: the caller's RLS applies, so everyone sees only their own sets.
-- ---------------------------------------------------------------------------

create or replace view public.v_set_facts with (security_invoker = true) as
select w.user_id,
       w.id            as workout_id,
       w.date,
       we.exercise_id,
       x.name          as exercise_name,
       x.part,
       s.id            as set_id,
       s.position      as set_position,
       s.weight,
       s.reps,
       s.unit,
       s.completed,
       s.weight * s.reps as volume
  from public.workout_sets s
  join public.workout_exercises we on we.id = s.workout_exercise_id
  join public.workouts w           on w.id = we.workout_id
  join public.exercises x          on x.id = we.exercise_id;
