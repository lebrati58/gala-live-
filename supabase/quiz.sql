-- =====================================================================
-- QUIZ BILINGUE — Gala Live
-- Tables et fonctions entièrement isolées du module de dons :
-- aucune lecture, écriture ou clé étrangère vers pledges / gala_settings.
-- Toutes les opérations passent par des fonctions SECURITY DEFINER
-- appelées avec la clé anon ; les tables elles-mêmes ne sont pas exposées.
-- Remplacer le marqueur ADMIN_KEY_SHA256 ci-dessous par le SHA-256 (hex) de QUIZ_ADMIN_KEY.
-- =====================================================================

create table if not exists public.quiz_config (
  id integer primary key default 1 check (id = 1),
  admin_key_hash text not null
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  position integer not null default 0,
  category text not null default 'israel' check (category in ('ei_israel','eeif','scoutisme','israel')),
  question_fr text not null check (char_length(question_fr) between 3 and 400),
  question_he text not null check (char_length(question_he) between 3 and 400),
  options_fr jsonb not null check (jsonb_typeof(options_fr) = 'array' and jsonb_array_length(options_fr) = 4),
  options_he jsonb not null check (jsonb_typeof(options_he) = 'array' and jsonb_array_length(options_he) = 4),
  correct_index smallint not null check (correct_index between 0 and 3),
  explanation_fr text not null default '',
  explanation_he text not null default '',
  source_label text not null default '',
  source_url text not null default '',
  time_limit_s integer not null default 20 check (time_limit_s between 5 and 120),
  active boolean not null default true,
  -- Échauffement (non noté, joué en premier) : 'seniors' = facile pour les anciens, 'juniors' = facile pour les jeunes
  warmup text check (warmup in ('seniors','juniors')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quiz_state (
  env text primary key check (env in ('production','preview')),
  run_id uuid,
  status text not null default 'idle' check (status in ('idle','lobby','question','reveal','finished')),
  question_ids uuid[] not null default '{}',
  current_index integer not null default -1,
  started_at timestamptz,
  deadline timestamptz,
  expected_players integer not null default 300 check (expected_players between 1 and 5000),
  -- Paliers de présence (en % des convives attendus) pour le démarrage automatique
  warmup_start_pct integer not null default 50 check (warmup_start_pct between 1 and 100),
  game_start_pct integer not null default 80 check (game_start_pct between 1 and 100),
  auto_start boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.quiz_state (env) values ('production'), ('preview') on conflict do nothing;

create table if not exists public.quiz_players (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null,
  env text not null check (env in ('production','preview')),
  nickname text not null check (char_length(nickname) between 1 and 30),
  table_number integer not null check (table_number between 1 and 500),
  token_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists quiz_players_run_idx on public.quiz_players (run_id, table_number);

create table if not exists public.quiz_answers (
  player_id uuid not null references public.quiz_players (id) on delete cascade,
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  run_id uuid not null,
  choice smallint not null check (choice between 0 and 3),
  is_correct boolean not null,
  points integer not null default 0,
  answered_at timestamptz not null default now(),
  primary key (player_id, question_id)
);
create index if not exists quiz_answers_run_idx on public.quiz_answers (run_id, question_id);

alter table public.quiz_config enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_state enable row level security;
alter table public.quiz_players enable row level security;
alter table public.quiz_answers enable row level security;
revoke all on public.quiz_config, public.quiz_questions, public.quiz_state, public.quiz_players, public.quiz_answers from anon, authenticated;

insert into public.quiz_config (id, admin_key_hash) values (1, '__ADMIN_KEY_SHA256__')
on conflict (id) do update set admin_key_hash = excluded.admin_key_hash;

-- ---------------------------------------------------------------- helpers
create or replace function public._quiz_sha(p text) returns text
language sql immutable set search_path = public, extensions as $$
  select encode(extensions.digest(coalesce(p, ''), 'sha256'), 'hex')
$$;

create or replace function public._quiz_admin_ok(p_key text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from quiz_config where id = 1 and admin_key_hash = public._quiz_sha(p_key))
$$;

-- Classement par table : moyenne des points par joueur (équitable quel que soit
-- le nombre de convives), puis total, puis numéro de table.
create or replace function public._quiz_tables(p_run uuid, p_limit integer default 10) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(t order by t.avg_points desc, t.total desc, t.table_number), '[]'::jsonb)
  from (
    select p.table_number,
           count(distinct p.id)::int as players,
           coalesce(sum(a.points), 0)::int as total,
           round(coalesce(sum(a.points), 0)::numeric / count(distinct p.id))::int as avg_points
    from quiz_players p
    left join quiz_answers a on a.player_id = p.id and a.run_id = p_run
    where p.run_id = p_run
    group by p.table_number
    order by avg_points desc, total desc, p.table_number
    limit p_limit
  ) t
$$;

create or replace function public._quiz_question_json(q quiz_questions) returns jsonb
language sql immutable as $$
  select jsonb_build_object(
    'id', q.id, 'category', q.category,
    'question_fr', q.question_fr, 'question_he', q.question_he,
    'options_fr', q.options_fr, 'options_he', q.options_he,
    'time_limit_s', q.time_limit_s, 'warmup', q.warmup)
$$;

create or replace function public._quiz_start_question(p_env text, p_idx integer) returns void
language plpgsql volatile security definer set search_path = public as $$
declare s quiz_state; lim int;
begin
  -- Conditionnel sur current_index : si plusieurs appels simultanés tentent le même
  -- enchaînement, un seul s'applique (pas de verrou nécessaire à chaque lecture).
  select * into s from quiz_state where env = p_env;
  if p_idx >= coalesce(array_length(s.question_ids, 1), 0) then
    update quiz_state set status = 'finished', updated_at = now() where env = p_env and current_index = p_idx - 1;
  else
    select time_limit_s into lim from quiz_questions where id = s.question_ids[p_idx + 1];
    update quiz_state set status = 'question', current_index = p_idx, started_at = now(),
      deadline = now() + make_interval(secs => coalesce(lim, 20)), updated_at = now()
     where env = p_env and current_index = p_idx - 1;
  end if;
end $$;

-- Enchaînements automatiques, appelés à chaque lecture de l'état :
--  * lobby, rien joué       -> échauffement dès que warmup_start_pct % des convives sont inscrits
--  * révélation d'échauffement depuis 18 s -> question d'échauffement suivante,
--    ou attente du palier de jeu après le dernier échauffement
--  * attente du jeu         -> 1re vraie question dès que game_start_pct % sont inscrits
create or replace function public._quiz_auto(p_env text) returns void
language plpgsql volatile security definer set search_path = public as $$
declare s quiz_state; n int; next_warm boolean; cur_warm boolean; total int;
begin
  update quiz_state set status = 'reveal', updated_at = now()
   where env = p_env and status = 'question' and deadline < now() - interval '1 second';
  select * into s from quiz_state where env = p_env;
  if s.run_id is null or s.status not in ('lobby','reveal') then return; end if;
  total := coalesce(array_length(s.question_ids, 1), 0);
  if s.current_index + 1 >= total and s.status = 'reveal' then return; end if;
  select warmup is not null into next_warm from quiz_questions where id = s.question_ids[s.current_index + 2];
  next_warm := coalesce(next_warm, false);
  if s.status = 'reveal' then
    select warmup is not null into cur_warm from quiz_questions where id = s.question_ids[s.current_index + 1];
    -- 8 s de réponse + 10 s d'écran de résultats avant l'échauffement suivant
    if coalesce(cur_warm, false) and s.updated_at < now() - interval '18 seconds' then
      if next_warm then perform _quiz_start_question(p_env, s.current_index + 1);
      else update quiz_state set status = 'lobby', updated_at = now()
            where env = p_env and status = 'reveal' and current_index = s.current_index; end if;
    end if;
    return;
  end if;
  -- status = lobby
  if not s.auto_start then return; end if;
  select count(*)::int into n from quiz_players where run_id = s.run_id;
  if n * 100 >= (case when next_warm then s.warmup_start_pct else s.game_start_pct end) * s.expected_players then
    perform _quiz_start_question(p_env, s.current_index + 1);
  end if;
end $$;

-- ------------------------------------------------------------ état public
create or replace function public.quiz_state_get(p_env text, p_player uuid default null, p_token text default null, p_full boolean default false)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  s quiz_state; q quiz_questions; out jsonb; me quiz_players; my_answer quiz_answers;
  total int; dist jsonb; answered int; players int; rank int; table_rows jsonb;
begin
  if p_env not in ('production','preview') then raise exception 'bad env'; end if;
  -- Fin du chrono (révélation auto, 1 s de tolérance réseau) et paliers de présence
  perform _quiz_auto(p_env);
  select * into s from quiz_state where env = p_env;
  total := coalesce(array_length(s.question_ids, 1), 0);
  select count(*)::int into players from quiz_players where run_id = s.run_id;
  out := jsonb_build_object('status', s.status, 'run_id', s.run_id, 'index', s.current_index, 'total', total,
                            'server_now', now(), 'players', players, 'updated_at', s.updated_at,
                            'expected_players', s.expected_players, 'warmup_start_pct', s.warmup_start_pct,
                            'game_start_pct', s.game_start_pct, 'auto_start', s.auto_start,
                            'next_is_warmup', coalesce((select warmup is not null from quiz_questions
                                                         where id = s.question_ids[s.current_index + 2]), false),
                            'warmups', (select count(*)::int from quiz_questions where id = any(s.question_ids) and warmup is not null));

  if s.status in ('question','reveal') and s.current_index between 0 and total - 1 then
    select * into q from quiz_questions where id = s.question_ids[s.current_index + 1];
    if found then
      select count(*)::int into answered from quiz_answers where run_id = s.run_id and question_id = q.id;
      out := out || jsonb_build_object('question', _quiz_question_json(q), 'started_at', s.started_at,
                                       'deadline', s.deadline, 'answers', answered);
      if s.status = 'reveal' then
        select jsonb_build_array(
                 count(*) filter (where choice = 0), count(*) filter (where choice = 1),
                 count(*) filter (where choice = 2), count(*) filter (where choice = 3))
          into dist from quiz_answers where run_id = s.run_id and question_id = q.id;
        out := out || jsonb_build_object('reveal', jsonb_build_object(
                 'correct_index', q.correct_index, 'explanation_fr', q.explanation_fr, 'explanation_he', q.explanation_he,
                 'source_label', q.source_label, 'source_url', q.source_url, 'distribution', dist));
      end if;
    end if;
  end if;

  if p_full or s.status in ('reveal','finished','lobby') then
    table_rows := _quiz_tables(s.run_id, case when p_full then 500 else 10 end);
    out := out || jsonb_build_object('tables', table_rows);
  end if;

  if p_player is not null then
    select * into me from quiz_players
     where id = p_player and run_id = s.run_id and token_hash = _quiz_sha(p_token);
    if found then
      out := out || jsonb_build_object('player', jsonb_build_object(
        'id', me.id, 'nickname', me.nickname, 'table_number', me.table_number,
        'score', (select coalesce(sum(points), 0)::int from quiz_answers where player_id = me.id),
        'answered', (select count(*)::int from quiz_answers where player_id = me.id)));
      if q.id is not null then
        select * into my_answer from quiz_answers where player_id = me.id and question_id = q.id;
        if found then
          out := jsonb_set(out, '{player,choice}', to_jsonb(my_answer.choice));
          if s.status = 'reveal' then
            out := jsonb_set(out, '{player,correct}', to_jsonb(my_answer.is_correct));
            out := jsonb_set(out, '{player,points}', to_jsonb(my_answer.points));
          end if;
        end if;
      end if;
      if s.status in ('reveal','finished') then
        select e.pos::int into rank
          from jsonb_array_elements(_quiz_tables(s.run_id, 500)) with ordinality as e(val, pos)
         where (e.val->>'table_number')::int = me.table_number;
        out := jsonb_set(out, '{player,table_rank}', to_jsonb(rank));
      end if;
    else
      out := out || jsonb_build_object('player', null);
    end if;
  end if;
  return out;
end $$;

-- ----------------------------------------------------------- joueur
create or replace function public.quiz_join(p_env text, p_nickname text, p_table integer)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions as $$
declare s quiz_state; tok text; pid uuid; n text := btrim(coalesce(p_nickname, ''));
begin
  select * into s from quiz_state where env = p_env;
  if not found or s.status not in ('lobby','question','reveal') or s.run_id is null then
    return jsonb_build_object('ok', false, 'error', 'closed');
  end if;
  if char_length(n) < 1 or char_length(n) > 30 then return jsonb_build_object('ok', false, 'error', 'nickname'); end if;
  if p_table is null or p_table < 1 or p_table > 500 then return jsonb_build_object('ok', false, 'error', 'table'); end if;
  if (select count(*) from quiz_players where run_id = s.run_id) >= 3000 then
    return jsonb_build_object('ok', false, 'error', 'full');
  end if;
  tok := encode(extensions.gen_random_bytes(18), 'hex');
  insert into quiz_players (run_id, env, nickname, table_number, token_hash)
  values (s.run_id, p_env, n, p_table, _quiz_sha(tok)) returning id into pid;
  return jsonb_build_object('ok', true, 'player_id', pid, 'token', tok, 'run_id', s.run_id);
end $$;

create or replace function public.quiz_answer(p_env text, p_player uuid, p_token text, p_question uuid, p_choice integer)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions as $$
declare s quiz_state; q quiz_questions; me quiz_players; remaining numeric; pts int; ok boolean; n int;
begin
  if p_choice is null or p_choice not between 0 and 3 then return jsonb_build_object('ok', false, 'error', 'choice'); end if;
  select * into s from quiz_state where env = p_env;
  select * into me from quiz_players where id = p_player and run_id = s.run_id and token_hash = _quiz_sha(p_token);
  if not found then return jsonb_build_object('ok', false, 'error', 'player'); end if;
  if s.status <> 'question' or s.question_ids[s.current_index + 1] is distinct from p_question
     or now() > s.deadline + interval '1 second' then
    return jsonb_build_object('ok', false, 'error', 'closed');
  end if;
  select * into q from quiz_questions where id = p_question;
  ok := (p_choice = q.correct_index);
  remaining := greatest(0, extract(epoch from (s.deadline - now())));
  -- 100 points pour une bonne réponse + jusqu'à 50 points de bonus rapidité
  pts := case when q.warmup is not null then 0 when ok then 100 + round(50 * least(1, remaining / q.time_limit_s))::int else 0 end;
  insert into quiz_answers (player_id, question_id, run_id, choice, is_correct, points)
  values (me.id, q.id, s.run_id, p_choice, ok, pts) on conflict do nothing;
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'accepted', n = 1);
end $$;

-- ----------------------------------------------------------- admin
create or replace function public.quiz_admin_questions(p_key text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not _quiz_admin_ok(p_key) then raise exception 'unauthorized'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(q) order by q.position, q.created_at), '[]'::jsonb) from quiz_questions q);
end $$;

create or replace function public.quiz_admin_save_question(p_key text, p_q jsonb) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare qid uuid;
begin
  if not _quiz_admin_ok(p_key) then raise exception 'unauthorized'; end if;
  if p_q ? 'id' and nullif(p_q->>'id', '') is not null then
    update quiz_questions set
      position = coalesce((p_q->>'position')::int, position),
      category = p_q->>'category',
      question_fr = btrim(p_q->>'question_fr'), question_he = btrim(p_q->>'question_he'),
      options_fr = p_q->'options_fr', options_he = p_q->'options_he',
      correct_index = (p_q->>'correct_index')::smallint,
      explanation_fr = coalesce(p_q->>'explanation_fr', ''), explanation_he = coalesce(p_q->>'explanation_he', ''),
      source_label = coalesce(p_q->>'source_label', ''), source_url = coalesce(p_q->>'source_url', ''),
      time_limit_s = coalesce((p_q->>'time_limit_s')::int, 20),
      active = coalesce((p_q->>'active')::boolean, true),
      warmup = nullif(p_q->>'warmup', ''),
      updated_at = now()
    where id = (p_q->>'id')::uuid returning id into qid;
    if qid is null then raise exception 'not found'; end if;
  else
    insert into quiz_questions (position, category, question_fr, question_he, options_fr, options_he, correct_index,
      explanation_fr, explanation_he, source_label, source_url, time_limit_s, active, warmup)
    values (coalesce((p_q->>'position')::int, (select coalesce(max(position), 0) + 10 from quiz_questions)),
      p_q->>'category', btrim(p_q->>'question_fr'), btrim(p_q->>'question_he'), p_q->'options_fr', p_q->'options_he',
      (p_q->>'correct_index')::smallint, coalesce(p_q->>'explanation_fr', ''), coalesce(p_q->>'explanation_he', ''),
      coalesce(p_q->>'source_label', ''), coalesce(p_q->>'source_url', ''),
      coalesce((p_q->>'time_limit_s')::int, 20), coalesce((p_q->>'active')::boolean, true), nullif(p_q->>'warmup', ''))
    returning id into qid;
  end if;
  return qid;
end $$;

create or replace function public.quiz_admin_delete_question(p_key text, p_id uuid) returns boolean
language plpgsql volatile security definer set search_path = public as $$
begin
  if not _quiz_admin_ok(p_key) then raise exception 'unauthorized'; end if;
  delete from quiz_questions where id = p_id;
  return found;
end $$;

create or replace function public.quiz_admin_control(p_key text, p_env text, p_action text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare s quiz_state; ids uuid[];
begin
  if not _quiz_admin_ok(p_key) then raise exception 'unauthorized'; end if;
  select * into s from quiz_state where env = p_env for update;
  if not found then raise exception 'bad env'; end if;
  if p_action = 'open' then
    select coalesce(array_agg(id order by (warmup is null), position, created_at), '{}') into ids from quiz_questions where active;
    if coalesce(array_length(ids, 1), 0) = 0 then raise exception 'no active question'; end if;
    update quiz_state set run_id = gen_random_uuid(), status = 'lobby', question_ids = ids, current_index = -1,
      started_at = null, deadline = null, updated_at = now() where env = p_env;
  elsif p_action = 'next' then
    if s.status not in ('lobby','question','reveal') then raise exception 'quiz not running'; end if;
    perform _quiz_start_question(p_env, s.current_index + 1);
  elsif p_action = 'reveal' then
    if s.status <> 'question' then raise exception 'no question running'; end if;
    update quiz_state set status = 'reveal', deadline = least(deadline, now()), updated_at = now() where env = p_env;
  elsif p_action = 'finish' then
    if s.run_id is null then raise exception 'quiz not opened'; end if;
    update quiz_state set status = 'finished', updated_at = now() where env = p_env;
  elsif p_action = 'close' then
    update quiz_state set status = 'idle', updated_at = now() where env = p_env;
  else
    raise exception 'bad action';
  end if;
  return quiz_state_get(p_env, null, null, true);
end $$;

create or replace function public.quiz_admin_settings(p_key text, p_env text, p_expected integer,
  p_warmup_pct integer, p_game_pct integer, p_auto boolean) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
begin
  if not _quiz_admin_ok(p_key) then raise exception 'unauthorized'; end if;
  if p_expected is null or p_expected not between 1 and 5000 then raise exception 'bad expected'; end if;
  if p_warmup_pct is null or p_game_pct is null or p_warmup_pct not between 1 and 100 or p_game_pct not between 1 and 100
     or p_warmup_pct > p_game_pct then raise exception 'bad thresholds'; end if;
  update quiz_state set expected_players = p_expected, warmup_start_pct = p_warmup_pct, game_start_pct = p_game_pct,
    auto_start = coalesce(p_auto, true) where env = p_env;
  return quiz_state_get(p_env, null, null, true);
end $$;

-- Droits : seules ces fonctions sont exécutables avec la clé anon.
revoke all on function public._quiz_sha(text), public._quiz_admin_ok(text), public._quiz_tables(uuid, integer),
  public._quiz_start_question(text, integer), public._quiz_auto(text),
  public._quiz_question_json(quiz_questions) from public, anon, authenticated;
revoke all on function public.quiz_state_get(text, uuid, text, boolean), public.quiz_join(text, text, integer),
  public.quiz_answer(text, uuid, text, uuid, integer), public.quiz_admin_questions(text),
  public.quiz_admin_save_question(text, jsonb), public.quiz_admin_delete_question(text, uuid),
  public.quiz_admin_control(text, text, text), public.quiz_admin_settings(text, text, integer, integer, integer, boolean) from public, authenticated;
grant execute on function public.quiz_state_get(text, uuid, text, boolean), public.quiz_join(text, text, integer),
  public.quiz_answer(text, uuid, text, uuid, integer), public.quiz_admin_questions(text),
  public.quiz_admin_save_question(text, jsonb), public.quiz_admin_delete_question(text, uuid),
  public.quiz_admin_control(text, text, text), public.quiz_admin_settings(text, text, integer, integer, integer, boolean) to anon, service_role;
