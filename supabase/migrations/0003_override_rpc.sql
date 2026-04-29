-- 0003_override_rpc.sql
-- Override upserts MUST flow through this RPC so the audit row is written
-- in the same transaction. RLS on weekly_overrides denies direct writes;
-- this function is SECURITY DEFINER and gates on auth_role().

create or replace function upsert_weekly_override(
  p_resource_id bigint,
  p_week_start_et date,
  p_pto_hours numeric,
  p_unavailable_hours numeric,
  p_note text
)
returns weekly_overrides
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor text := auth.jwt() ->> 'sub';
  v_email text := coalesce(auth.jwt() ->> 'email', 'unknown');
  v_before jsonb;
  v_after weekly_overrides;
begin
  if auth_role() not in ('manager','admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_pto_hours < 0 or p_unavailable_hours < 0 then
    raise exception 'hours must be non-negative';
  end if;

  select to_jsonb(o.*) into v_before
  from weekly_overrides o
  where o.resource_id = p_resource_id and o.week_start_et = p_week_start_et;

  insert into weekly_overrides (resource_id, week_start_et, pto_hours, unavailable_hours, note, updated_by_clerk_user_id)
  values (p_resource_id, p_week_start_et, p_pto_hours, p_unavailable_hours, p_note, v_actor)
  on conflict (resource_id, week_start_et) do update
    set pto_hours = excluded.pto_hours,
        unavailable_hours = excluded.unavailable_hours,
        note = excluded.note,
        updated_by_clerk_user_id = excluded.updated_by_clerk_user_id,
        updated_at = now()
  returning * into v_after;

  insert into audit_log (actor_clerk_user_id, actor_email, action, entity_type, entity_id, before_jsonb, after_jsonb)
  values (
    v_actor, v_email, 'override.upsert', 'weekly_override',
    v_after.id::text, v_before, to_jsonb(v_after)
  );

  return v_after;
end;
$$;

grant execute on function upsert_weekly_override(bigint, date, numeric, numeric, text) to authenticated;
