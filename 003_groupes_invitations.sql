-- =====================================================================
-- Lightwess Collection : mise à jour n°3 — groupes, invitations, partage
-- À lancer une fois : Supabase → SQL Editor → New query → Run
-- (Supabase affichera « Potential issue detected » : c'est normal, clique sur Run query.)
-- =====================================================================

-- ---------- Tables ----------
create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 40),
  description text check (char_length(description) <= 280),
  color       text not null default '#8B5CF6' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  invite_code text not null unique default substr(md5(random()::text || clock_timestamp()::text), 1, 10),
  created_at  timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id  uuid not null references public.groups(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists group_members_user_idx on public.group_members (user_id);

grant select, insert, update, delete on public.groups, public.group_members to authenticated;

-- ---------- Fonctions ----------
create or replace function public.is_group_member(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = gid and user_id = auth.uid());
$$;

create or replace function public.group_role(gid uuid) returns text
language sql stable security definer set search_path = public as $$
  select role from group_members where group_id = gid and user_id = auth.uid();
$$;

create or replace function public.shares_group(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from group_members m1 join group_members m2 on m1.group_id = m2.group_id
    where m1.user_id = a and m2.user_id = b
  );
$$;

-- Les membres d'un même groupe voient la collection des autres (sauf si elle est « Moi seul »).
create or replace function public.can_view_collection(owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select owner = auth.uid()
      or is_admin()
      or exists (
        select 1 from profiles p
        where p.id = owner
          and (p.collection_visibility = 'public'
               or (p.collection_visibility = 'friends' and (are_friends(owner, auth.uid()) or shares_group(owner, auth.uid()))))
      );
$$;

create or replace function public.create_group(p_name text, p_description text default null, p_color text default '#8B5CF6')
returns uuid language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  if not is_active_user() then raise exception 'Compte non autorisé'; end if;
  insert into groups (name, description, color, owner_id)
  values (trim(p_name), nullif(trim(coalesce(p_description, '')), ''), coalesce(p_color, '#8B5CF6'), auth.uid())
  returning id into gid;
  insert into group_members (group_id, user_id, role) values (gid, auth.uid(), 'owner');
  return gid;
end $$;

create or replace function public.join_group(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  if not is_active_user() then raise exception 'Compte non autorisé'; end if;
  select id into gid from groups where invite_code = lower(trim(p_code));
  if gid is null then raise exception 'Lien d''invitation invalide ou expiré'; end if;
  insert into group_members (group_id, user_id, role) values (gid, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;
  return gid;
end $$;

-- Aperçu d'un groupe avant de le rejoindre (visible même sans compte).
create or replace function public.group_preview(p_code text)
returns table (id uuid, name text, description text, color text, members bigint)
language sql stable security definer set search_path = public as $$
  select g.id, g.name, g.description, g.color, (select count(*) from group_members m where m.group_id = g.id)
  from groups g where g.invite_code = lower(trim(p_code));
$$;

create or replace function public.regenerate_group_code(gid uuid) returns text
language plpgsql security definer set search_path = public as $$
declare code text := substr(md5(random()::text || clock_timestamp()::text), 1, 10);
begin
  if coalesce(group_role(gid), '') not in ('owner', 'admin') then raise exception 'Réservé aux responsables du groupe'; end if;
  update groups set invite_code = code where id = gid;
  return code;
end $$;

-- Aperçu public d'un joueur pour les liens d'ami (pseudo, nom, avatar, couleur seulement).
create or replace function public.profile_preview(p_handle text)
returns table (id uuid, handle citext, display_name text, avatar_url text, accent_color text)
language sql stable security definer set search_path = public as $$
  select id, handle, display_name, avatar_url, accent_color from profiles
  where handle = lower(trim(p_handle)) and not is_banned;
$$;

grant execute on function public.group_preview(text), public.profile_preview(text) to anon, authenticated;
grant execute on function public.is_group_member(uuid), public.group_role(uuid), public.shares_group(uuid, uuid),
  public.can_view_collection(uuid), public.create_group(text, text, text), public.join_group(text),
  public.regenerate_group_code(uuid) to authenticated;

-- ---------- Sécurité (RLS) ----------
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

drop policy if exists groups_read on public.groups;
drop policy if exists groups_update on public.groups;
drop policy if exists groups_delete on public.groups;
create policy groups_read on public.groups for select to authenticated using (is_group_member(id) or is_admin());
create policy groups_update on public.groups for update to authenticated using (coalesce(group_role(id), '') in ('owner', 'admin'));
create policy groups_delete on public.groups for delete to authenticated using (owner_id = auth.uid() or is_admin());

drop policy if exists gm_read on public.group_members;
drop policy if exists gm_delete on public.group_members;
drop policy if exists gm_update on public.group_members;
create policy gm_read on public.group_members for select to authenticated using (is_group_member(group_id) or is_admin());
-- Quitter un groupe, ou en retirer quelqu'un si on en est responsable (jamais le propriétaire).
create policy gm_delete on public.group_members for delete to authenticated
  using ((user_id = auth.uid() and role <> 'owner') or (coalesce(group_role(group_id), '') in ('owner', 'admin') and role <> 'owner'));
create policy gm_update on public.group_members for update to authenticated
  using (group_role(group_id) = 'owner') with check (role in ('admin', 'member'));
