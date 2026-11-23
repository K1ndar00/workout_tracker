-- Aggregates for the progress screen (and for analysis in SQL / Python).
-- Only completed sets are counted, like the volume shown on the workout screen.
-- Weights are converted to kg (lbs * 0.45359237) so units can be mixed.
-- security_invoker: the caller's RLS applies, so everyone sees only their own data.
-- The app reads aggregated rows, not individual sets: the Supabase API returns at most 1000 rows per request.

-- v_set_facts gets kg columns (added at the end, so existing columns keep their positions).
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
       s.weight * s.reps as volume,
       round(s.weight * case s.unit when 'lbs' then 0.45359237 else 1 end, 2)          as weight_kg,
       round(s.weight * s.reps * case s.unit when 'lbs' then 0.45359237 else 1 end, 2) as volume_kg
  from public.workout_sets s
  join public.workout_exercises we on we.id = s.workout_exercise_id
  join public.workouts w           on w.id = we.workout_id
  join public.exercises x          on x.id = we.exercise_id;

-- Per body part and week (weeks start on Monday).
create or replace view public.v_part_weekly with (security_invoker = true) as
select user_id,
       date_trunc('week', date)::date as week_start,
       part,
       count(*)                       as sets,
       sum(volume_kg)                 as volume_kg,
       count(distinct workout_id)     as workouts
  from public.v_set_facts
 where completed
 group by user_id, date_trunc('week', date)::date, part;

-- Per exercise and day: used for the trend of one exercise.
create or replace view public.v_exercise_daily with (security_invoker = true) as
select user_id,
       date,
       exercise_id,
       exercise_name,
       part,
       count(*)         as sets,
       sum(reps)        as reps,
       sum(volume_kg)   as volume_kg,
       max(weight_kg)   as max_weight_kg
  from public.v_set_facts
 where completed
 group by user_id, date, exercise_id, exercise_name, part;

-- Per exercise over all time: one row per exercise.
create or replace view public.v_exercise_summary with (security_invoker = true) as
select user_id,
       exercise_id,
       exercise_name,
       part,
       count(distinct date) as sessions,
       sum(volume_kg)       as total_volume_kg,
       max(weight_kg)       as best_weight_kg,
       max(date)            as last_date
  from public.v_set_facts
 where completed
 group by user_id, exercise_id, exercise_name, part;
