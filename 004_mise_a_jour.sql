-- =====================================================================
-- Lightwess Collection : mise à jour 004
-- Cadrage de la bannière, classement des joueurs (et badges),
-- partie « spoilers » séparée dans les avis, résumés en français,
-- listes de jeux (top 10…) et jeux populaires sur le site.
-- Tu peux le relancer sans risque, même si tu l'as déjà fait.
-- À coller dans Supabase → SQL Editor → Run.
-- =====================================================================

-- 1. Cadrage de la bannière (position de l'image, en % horizontal et vertical).
alter table public.profiles add column if not exists banner_pos_x smallint not null default 50;
alter table public.profiles add column if not exists banner_pos_y smallint not null default 50;
alter table public.profiles drop constraint if exists profiles_banner_pos_chk;
alter table public.profiles add constraint profiles_banner_pos_chk
  check (banner_pos_x between 0 and 100 and banner_pos_y between 0 and 100);

-- 1b. Avis : une partie sans spoilers (visible) + une partie avec spoilers (floutée).
alter table public.user_games add column if not exists spoiler_text text;
alter table public.user_games drop constraint if exists user_games_spoiler_len_chk;
alter table public.user_games add constraint user_games_spoiler_len_chk check (spoiler_text is null or char_length(spoiler_text) <= 5000);

-- 1c. Résumé du jeu en français (rempli automatiquement, puis gardé en mémoire).
alter table public.games add column if not exists summary_fr text;

-- 2. Classement : uniquement des totaux, jamais le détail des collections.
--    Les joueurs dont la collection est réglée sur « Moi seul » n'apparaissent pas.
create or replace function public.leaderboard()
returns table (
  id uuid, handle text, display_name text, avatar_url text, accent_color text, role text,
  games bigint, finished bigint, platinum bigint, hours numeric, reviews bigint, avg_rating numeric
)
language sql stable security definer set search_path = public as $$
  select p.id, p.handle::text, p.display_name, p.avatar_url, p.accent_color, p.role,
         count(ug.id)                                                         as games,
         count(ug.id) filter (where ug.status in ('termine', 'platine'))      as finished,
         count(ug.id) filter (where ug.status = 'platine')                    as platinum,
         coalesce(round(sum(ug.playtime_hours)), 0)                           as hours,
         count(ug.id) filter (where coalesce(char_length(ug.review), 0) + coalesce(char_length(ug.spoiler_text), 0) > 0) as reviews,
         round(avg(ug.rating), 2)                                             as avg_rating
  from profiles p
  left join user_games ug on ug.user_id = p.id
  where p.handle is not null and not p.is_banned and p.collection_visibility <> 'private'
    and auth.uid() is not null
  group by p.id;
$$;
revoke all on function public.leaderboard() from public, anon;
grant execute on function public.leaderboard() to authenticated;

-- 3. LISTES de jeux (top 10, top jeux solo…), publiques ou privées.
create table if not exists public.lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 80),
  description text check (char_length(description) <= 500),
  ranked      boolean not null default true,
  is_public   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists lists_user_idx on public.lists (user_id, updated_at desc);

create table if not exists public.list_items (
  list_id   uuid not null references public.lists(id) on delete cascade,
  game_id   uuid not null references public.games(id) on delete cascade,
  position  integer not null,
  note      text check (char_length(note) <= 280),
  added_at  timestamptz not null default now(),
  primary key (list_id, game_id)
);
create index if not exists list_items_order_idx on public.list_items (list_id, position);

drop trigger if exists lists_touch on public.lists;
create trigger lists_touch before update on public.lists for each row execute function public.touch_updated_at();

alter table public.lists      enable row level security;
alter table public.list_items enable row level security;

create or replace function public.can_view_list(l uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from lists where id = l and (is_public or user_id = auth.uid() or is_admin()));
$$;
create or replace function public.owns_list(l uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from lists where id = l and user_id = auth.uid());
$$;

drop policy if exists lists_read on public.lists;
drop policy if exists lists_insert on public.lists;
drop policy if exists lists_update on public.lists;
drop policy if exists lists_delete on public.lists;
create policy lists_read   on public.lists for select to authenticated using (is_public or user_id = auth.uid() or is_admin());
create policy lists_insert on public.lists for insert to authenticated with check (user_id = auth.uid() and is_active_user());
create policy lists_update on public.lists for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy lists_delete on public.lists for delete to authenticated using (user_id = auth.uid() or is_admin());

drop policy if exists li_read on public.list_items;
drop policy if exists li_write on public.list_items;
create policy li_read  on public.list_items for select to authenticated using (can_view_list(list_id));
create policy li_write on public.list_items for all to authenticated using (owns_list(list_id)) with check (owns_list(list_id));

-- 4. Jeux populaires sur Lightwess (ajoutés ou mis à jour récemment) : uniquement des totaux.
create or replace function public.trending_games(days integer default 30, lim integer default 20)
returns table (game_id uuid, players bigint)
language sql stable security definer set search_path = public as $$
  select ug.game_id, count(distinct ug.user_id) as players
  from user_games ug join profiles p on p.id = ug.user_id
  where ug.updated_at > now() - make_interval(days => days)
    and not p.is_banned and p.collection_visibility <> 'private' and auth.uid() is not null
  group by ug.game_id
  order by players desc, max(ug.updated_at) desc
  limit lim;
$$;
revoke all on function public.trending_games(integer, integer) from public, anon;
grant execute on function public.trending_games(integer, integer) to authenticated;

-- 5. GROUPES : photo, bannière, discussion, ajout direct de membres.
alter table public.groups add column if not exists avatar_url text;
alter table public.groups add column if not exists banner_url text;
alter table public.groups add column if not exists banner_pos_y smallint not null default 50;

create table if not exists public.group_messages (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text check (char_length(body) <= 2000),
  gif_url    text check (gif_url is null or (gif_url ~ '^https://' and char_length(gif_url) <= 1000)),
  created_at timestamptz not null default now(),
  check (coalesce(char_length(trim(body)), 0) > 0 or gif_url is not null)
);
create index if not exists group_messages_idx on public.group_messages (group_id, created_at desc);
alter table public.group_messages enable row level security;
grant select, insert, delete on public.group_messages to authenticated;

drop policy if exists gmsg_read on public.group_messages;
drop policy if exists gmsg_insert on public.group_messages;
drop policy if exists gmsg_delete on public.group_messages;
create policy gmsg_read   on public.group_messages for select to authenticated using (is_group_member(group_id) or is_admin());
create policy gmsg_insert on public.group_messages for insert to authenticated
  with check (user_id = auth.uid() and is_group_member(group_id) and is_active_user());
create policy gmsg_delete on public.group_messages for delete to authenticated
  using (user_id = auth.uid() or coalesce(group_role(group_id), '') in ('owner', 'admin') or is_admin());

-- Messages en direct (sans recharger la page).
do $$ begin
  alter publication supabase_realtime add table public.group_messages;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- Ajouter quelqu'un directement : un membre peut ajouter ses amis ; le créateur et les admins peuvent ajouter n'importe quel @pseudo.
create or replace function public.add_group_member(gid uuid, p_handle text) returns uuid
language plpgsql security definer set search_path = public as $$
declare target uuid; my_role text := group_role(gid);
begin
  if my_role is null then raise exception 'Tu ne fais pas partie de ce groupe'; end if;
  select id into target from profiles where handle = lower(trim(both '@' from trim(p_handle))) and not is_banned;
  if target is null then raise exception 'Aucun joueur avec ce pseudo'; end if;
  if my_role not in ('owner', 'admin') and not are_friends(auth.uid(), target) then
    raise exception 'Ajoute-le d''abord en ami (ou demande au créateur du groupe)';
  end if;
  insert into group_members (group_id, user_id, role) values (gid, target, 'member') on conflict (group_id, user_id) do nothing;
  return target;
end $$;
grant execute on function public.add_group_member(uuid, text) to authenticated;
