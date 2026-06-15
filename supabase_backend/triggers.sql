-- 1. Sync auth.users with public.users on signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  default_role text;
  username text;
begin
  -- Determine role based on email context or metadata
  default_role := coalesce(new.raw_user_meta_data->>'role', 'student');
  
  -- Force admin role only if email domain is admin.campusstay.com
  if new.email like '%@admin.campusstay.com' then
    default_role := 'admin';
  else
    -- If role is admin but email domain does not match, downgrade to student
    if default_role = 'admin' then
      default_role := 'student';
    end if;
  end if;

  username := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));

  insert into public.users (id, name, email, phone, role, profile_pic, verified, trust_score)
  values (
    new.id,
    username,
    new.email,
    new.phone,
    default_role,
    'https://api.dicebear.com/7.x/adventurer/svg?seed=' || new.id,
    (default_role = 'admin'), -- admins auto-verified
    85
  );

  -- Create welcome notification
  insert into public.notifications (user_id, type, title, message)
  values (
    new.id,
    'system',
    'Welcome to CampusStay!',
    'Your profile has been created successfully as a ' || default_role || '.'
  );

  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution bindings
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. Maintenance SLA escalation handler
create or replace function public.escalate_ticket_sla()
returns trigger as $$
begin
  -- Check if ticket status transitions to "Escalated"
  if old.status = 'Open' and new.status = 'Escalated' then
    -- Generate notification alert to owner
    insert into public.notifications (user_id, type, title, message)
    values (
      new.owner_id,
      'sla_breach',
      '⚠️ SLA ESCALATION ALARM',
      'Maintenance Ticket #' || new.id || ' for room was escalated due to non-response inside 24 hours.'
    );

    -- Reduce owner trust score by 5 points (min limit 50)
    update public.users
    set trust_score = greatest(50, trust_score - 5)
    where id = new.owner_id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Bind ticket escalation trigger
drop trigger if exists on_maintenance_escalated on public.maintenance;
create trigger on_maintenance_escalated
  after update on public.maintenance
  for each row execute procedure public.escalate_ticket_sla();


-- 3. Prevent non-admin users from escalating their own role, verification, or trust score
create or replace function public.check_user_role_update()
returns trigger as $$
begin
  if not public.is_admin() then
    if old.role <> new.role then
      raise exception 'Unauthorized to modify role column';
    end if;
    if old.verified <> new.verified then
      raise exception 'Unauthorized to modify verified column';
    end if;
    if old.trust_score <> new.trust_score then
      raise exception 'Unauthorized to modify trust_score column';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_user_profile_update on public.users;
create trigger on_user_profile_update
  before update on public.users
  for each row execute procedure public.check_user_role_update();


-- 4. Automate booking status transitions on payment success
create or replace function public.handle_payment_success()
returns trigger as $$
begin
  if new.status = 'Successful' then
    update public.bookings
    set status = 'Active'
    where id = new.booking_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_payment_success on public.payments;
create trigger on_payment_success
  after insert or update on public.payments
  for each row execute procedure public.handle_payment_success();
