-- Lightwess Collection : mise à jour n°2 (à lancer une fois dans Supabase → SQL Editor → Run)

-- Droits de base pour le site (les règles de sécurité RLS s'appliquent toujours).
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
grant select on public.games to anon;
grant insert on public.site_events to anon;
grant execute on all functions in schema public to authenticated;

-- Les modérateurs peuvent retirer le texte d'un avis.
drop policy if exists ug_admin_update on public.user_games;
create policy ug_admin_update on public.user_games for update to authenticated using (is_admin()) with check (is_admin());

-- Une ancienne demande d'ami refusée peut être supprimée par l'un ou l'autre (déjà prévu) ;
-- on autorise aussi le temps réel sur la collection pour les mises à jour en direct.
do $$ begin
  alter publication supabase_realtime add table public.user_games;
exception when others then null; end $$;
