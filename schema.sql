-- =====================================================================
-- Lightwess Collection — schéma Supabase (PostgreSQL)
-- À exécuter en entier : Supabase → SQL Editor → New query → Run.
-- Aucune donnée d'exemple : la base démarre vide.
-- =====================================================================

create extension if not exists citext;

-- ---------------------------------------------------------------------
-- 1. PROFILS
-- Le @handle est stocké sans le « @ » (affiché avec dans l'interface).
-- Il est NULL tant que l'utilisateur ne l'a pas choisi (cas Discord/Google) :
-- l'app le redirige alors vers /onboarding.
-- ---------------------------------------------------------------------
create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  handle                citext unique
                        check (handle is null or handle ~ '^[a-z0-9_]{3,20}$'),
  display_name          text check (char_length(display_name) <= 40),
  avatar_url            text,
  banner_url            text,
  bio                   text check (char_length(bio) <= 280),
  accent_color          text default '#8B5CF6' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  steam_id              text unique check (steam_id is null or steam_id ~ '^[0-9]{17}$'),
  collection_visibility text not null default 'friends'
                        check (collection_visibility in ('public', 'friends', 'private')),
  role                  text not null default 'user' check (role in ('user', 'admin')),
  is_banned             boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. JEUX (cache local des fiches IGDB / Steam)
-- Un jeu peut venir d'IGDB (igdb_id), de Steam (steam_appid) ou des deux :
-- les deux identifiants sont uniques, ce qui empêche les doublons.
-- ---------------------------------------------------------------------
create table public.games (
  id            uuid primary key default gen_random_uuid(),
  igdb_id       bigint unique,
  steam_appid   integer unique,
  slug          text,
  name          text not null,
  cover_url     text,          -- jaquette officielle (IGDB t_cover_big_2x ou Steam library_600x900)
  banner_url    text,          -- artwork / header 16:9
  release_year  integer,
  genres        text[] not null default '{}',
  platforms     text[] not null default '{}',
  summary       text,
  avg_hours     numeric(6,1),  -- durée moyenne si connue
  dominant_color text check (dominant_color is null or dominant_color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (igdb_id is not null or steam_appid is not null)
);
create index games_name_idx on public.games using gin (to_tsvector('simple', name));

-- ---------------------------------------------------------------------
-- 3. COLLECTION (un jeu dans la collection d'un utilisateur, + son avis)
-- ---------------------------------------------------------------------
create table public.user_games (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  game_id         uuid not null references public.games(id) on delete cascade,
  status          text not null default 'a_faire'
                  check (status in ('a_faire', 'en_cours', 'termine', 'platine', 'abandonne')),
  rating          numeric(2,1) check (rating is null or (rating between 0.5 and 5 and rating * 2 = floor(rating * 2))),
  scores          jsonb not null default '{}',   -- {"graphismes":4.5,"histoire":5,...}
  difficulty      numeric(2,1) check (difficulty is null or difficulty between 0.5 and 5),
  review          text check (char_length(review) <= 5000),
  has_spoilers    boolean not null default false,
  started_on      date,
  finished_on     date,
  playtime_hours  numeric(8,1) check (playtime_hours is null or playtime_hours >= 0),
  platform        text,
  top_rank        smallint check (top_rank between 1 and 5),
  source          text not null default 'manual' check (source in ('manual', 'steam', 'swipe')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, game_id)
);
create index user_games_user_idx on public.user_games (user_id, status);
create index user_games_game_idx on public.user_games (game_id);
create unique index user_games_top_rank_uniq on public.user_games (user_id, top_rank) where top_rank is not null;

-- ---------------------------------------------------------------------
-- 4. AMIS (demandes + amitiés)
-- Une seule ligne par paire, quel que soit le sens de la demande.
-- ---------------------------------------------------------------------
create table public.friendships (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.profiles(id) on delete cascade,
  addressee_id  uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  check (requester_id <> addressee_id)
);
create unique index friendships_pair_uniq
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee_idx on public.friendships (addressee_id, status);

-- ---------------------------------------------------------------------
-- 5. SOCIAL : j'aime et réponses sur les avis
-- ---------------------------------------------------------------------
create table public.review_likes (
  user_game_id uuid not null references public.user_games(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (user_game_id, user_id)
);

create table public.review_replies (
  id            uuid primary key default gen_random_uuid(),
  user_game_id  uuid not null references public.user_games(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  body          text not null check (char_length(body) between 1 and 1000),
  created_at    timestamptz not null default now()
);
create index review_replies_ug_idx on public.review_replies (user_game_id, created_at);

-- ---------------------------------------------------------------------
-- 6. SWIPES (Découvrir) — privés
-- ---------------------------------------------------------------------
create table public.swipes (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  game_id    uuid not null references public.games(id) on delete cascade,
  direction  text not null check (direction in ('left', 'right')),
  created_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

-- ---------------------------------------------------------------------
-- 7. STATISTIQUES DU SITE (page modérateur)
-- ---------------------------------------------------------------------
create table public.site_events (
  id         bigint generated always as identity primary key,
  type       text not null check (type in ('visit', 'signup', 'steam_import', 'game_added')),
  user_id    uuid references public.profiles(id) on delete set null,
  path       text check (char_length(path) <= 200),
  created_at timestamptz not null default now()
);
create index site_events_time_idx on public.site_events (created_at desc, type);

-- =====================================================================
-- FONCTIONS
-- =====================================================================

-- updated_at automatique
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch   before update on public.profiles   for each row execute function public.touch_updated_at();
create trigger games_touch      before update on public.games      for each row execute function public.touch_updated_at();
create trigger user_games_touch before update on public.user_games for each row execute function public.touch_updated_at();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_active_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and not is_banned and handle is not null);
$$;

create or replace function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from friendships
    where status = 'accepted'
      and least(requester_id, addressee_id) = least(a, b)
      and greatest(requester_id, addressee_id) = greatest(a, b)
  );
$$;

-- Qui peut voir la collection (et les avis) d'un utilisateur ?
create or replace function public.can_view_collection(owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select owner = auth.uid()
      or is_admin()
      or exists (
        select 1 from profiles p
        where p.id = owner
          and (p.collection_visibility = 'public'
               or (p.collection_visibility = 'friends' and are_friends(owner, auth.uid())))
      );
$$;

-- Création automatique du profil à l'inscription.
-- Le handle choisi au formulaire (metadata « handle ») est repris s'il est valide et libre.
-- Le tout premier compte du site devient administrateur.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  wanted citext := lower(nullif(new.raw_user_meta_data->>'handle', ''));
begin
  if wanted is not null and (wanted !~ '^[a-z0-9_]{3,20}$' or exists (select 1 from profiles where handle = wanted)) then
    wanted := null;
  end if;
  insert into profiles (id, handle, display_name, avatar_url, role)
  values (
    new.id,
    wanted,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    case when not exists (select 1 from profiles) then 'admin' else 'user' end
  );
  insert into site_events (type, user_id) values ('signup', new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Garde-fous sur le profil : rôle/bannissement réservés aux admins, handle définitif une fois choisi.
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.is_banned is distinct from old.is_banned) and not is_admin() then
    raise exception 'Action réservée aux administrateurs';
  end if;
  if old.handle is not null and new.handle is distinct from old.handle and not is_admin() then
    raise exception 'Le @handle ne peut plus être modifié';
  end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile();

-- Une demande d'ami ne peut être acceptée/refusée que par son destinataire.
create or replace function public.protect_friendship() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.requester_id <> old.requester_id or new.addressee_id <> old.addressee_id then
    raise exception 'Demande non modifiable';
  end if;
  if new.status <> old.status then
    if auth.uid() <> old.addressee_id then raise exception 'Seul le destinataire peut répondre'; end if;
    new.responded_at := now();
  end if;
  return new;
end $$;
create trigger friendships_protect before update on public.friendships
  for each row execute function public.protect_friendship();

-- Liste d'amis de l'utilisateur connecté.
create or replace function public.my_friends()
returns table (friend_id uuid, handle citext, display_name text, avatar_url text, accent_color text, since timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.handle, p.display_name, p.avatar_url, p.accent_color, f.responded_at
  from friendships f
  join profiles p on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  where f.status = 'accepted' and auth.uid() in (f.requester_id, f.addressee_id)
  order by p.handle;
$$;

-- Statistiques pour la page admin (refuse si l'appelant n'est pas admin).
create or replace function public.admin_stats(days integer default 30) returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Accès refusé'; end if;
  return json_build_object(
    'users',          (select count(*) from profiles),
    'users_7d',       (select count(*) from profiles where created_at > now() - interval '7 days'),
    'active_7d',      (select count(distinct user_id) from user_games where updated_at > now() - interval '7 days'),
    'reviews',        (select count(*) from user_games where review is not null or rating is not null),
    'games',          (select count(*) from games),
    'collection_rows',(select count(*) from user_games),
    'daily', (
      select coalesce(json_agg(d order by d.day), '[]'::json) from (
        select gs::date as day,
               (select count(*) from site_events e where e.type = 'visit'  and e.created_at::date = gs::date) as visits,
               (select count(*) from site_events e where e.type = 'signup' and e.created_at::date = gs::date) as signups
        from generate_series(current_date - (days - 1), current_date, interval '1 day') gs
      ) d
    ),
    'top_games', (
      select coalesce(json_agg(t), '[]'::json) from (
        select g.id, g.name, g.cover_url, count(*) as owners
        from user_games ug join games g on g.id = ug.game_id
        group by g.id order by owners desc limit 10
      ) t
    )
  );
end $$;

-- Suppression complète de son propre compte.
create or replace function public.delete_my_account() returns void
language sql security definer set search_path = public, auth as $$
  delete from auth.users where id = auth.uid();
$$;

-- =====================================================================
-- SÉCURITÉ : ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles       enable row level security;
alter table public.games          enable row level security;
alter table public.user_games     enable row level security;
alter table public.friendships    enable row level security;
alter table public.review_likes   enable row level security;
alter table public.review_replies enable row level security;
alter table public.swipes         enable row level security;
alter table public.site_events    enable row level security;

-- Profils : infos publiques lisibles par les membres connectés (recherche par @handle).
create policy profiles_read   on public.profiles for select to authenticated using (true);
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or is_admin()) with check (id = auth.uid() or is_admin());

-- Jeux : catalogue partagé. Les membres actifs peuvent ajouter/enrichir une fiche.
create policy games_read   on public.games for select using (true);
create policy games_insert on public.games for insert to authenticated with check (is_active_user());
create policy games_update on public.games for update to authenticated using (is_active_user());
create policy games_delete on public.games for delete to authenticated using (is_admin());

-- Collection : visible selon la confidentialité du propriétaire, modifiable par lui seul.
create policy ug_read   on public.user_games for select to authenticated using (can_view_collection(user_id));
create policy ug_insert on public.user_games for insert to authenticated with check (user_id = auth.uid() and is_active_user());
create policy ug_update on public.user_games for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ug_delete on public.user_games for delete to authenticated using (user_id = auth.uid() or is_admin());

-- Amis : chaque participant voit ses demandes ; on n'envoie qu'en son nom et en « pending ».
create policy fr_read   on public.friendships for select to authenticated using (auth.uid() in (requester_id, addressee_id));
create policy fr_insert on public.friendships for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending' and is_active_user());
create policy fr_update on public.friendships for update to authenticated
  using (addressee_id = auth.uid()) with check (status in ('accepted', 'declined'));
create policy fr_delete on public.friendships for delete to authenticated using (auth.uid() in (requester_id, addressee_id));

-- J'aime / réponses : seulement sur les avis qu'on a le droit de voir.
create policy likes_read on public.review_likes for select to authenticated
  using (exists (select 1 from user_games ug where ug.id = user_game_id and can_view_collection(ug.user_id)));
create policy likes_write on public.review_likes for insert to authenticated
  with check (user_id = auth.uid() and is_active_user()
              and exists (select 1 from user_games ug where ug.id = user_game_id and can_view_collection(ug.user_id)));
create policy likes_delete on public.review_likes for delete to authenticated using (user_id = auth.uid());

create policy replies_read on public.review_replies for select to authenticated
  using (exists (select 1 from user_games ug where ug.id = user_game_id and can_view_collection(ug.user_id)));
create policy replies_write on public.review_replies for insert to authenticated
  with check (user_id = auth.uid() and is_active_user()
              and exists (select 1 from user_games ug where ug.id = user_game_id and can_view_collection(ug.user_id)));
create policy replies_delete on public.review_replies for delete to authenticated
  using (user_id = auth.uid() or is_admin()
         or exists (select 1 from user_games ug where ug.id = user_game_id and ug.user_id = auth.uid()));

-- Swipes : strictement privés.
create policy swipes_own on public.swipes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Statistiques : n'importe qui peut enregistrer une visite, seuls les admins lisent.
create policy events_insert on public.site_events for insert to anon, authenticated
  with check (type = 'visit' and (user_id is null or user_id = auth.uid()));
create policy events_read on public.site_events for select to authenticated using (is_admin());

-- =====================================================================
-- STOCKAGE : avatars et bannières (un dossier par utilisateur)
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy media_read on storage.objects for select using (bucket_id = 'media');
create policy media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy media_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
-- TEMPS RÉEL : notifications de demandes d'amis et réponses aux avis
-- =====================================================================
alter publication supabase_realtime add table public.friendships;
alter publication supabase_realtime add table public.review_replies;
