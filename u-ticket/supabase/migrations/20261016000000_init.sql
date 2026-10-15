-- U Ticket: schema เริ่มต้น
-- การเข้าถึงข้อมูลทั้งหมดผ่าน API routes ฝั่ง server ด้วย service role
-- ทุกตารางเปิด RLS และไม่มี policy ให้ anon/authenticated → client อ่านเขียนตรงไม่ได้

-- ---------------------------------------------------------------- ตาราง

create table public.organizers (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id text primary key,                                   -- u01…u24, org-pro, admin, staff …
  auth_id uuid unique references auth.users (id) on delete set null,
  email text unique,
  role text not null check (role in ('buyer', 'organizer', 'admin', 'staff')),
  organizer_id text references public.organizers (id),   -- organizer/staff สังกัดผู้จัดไหน
  display_name text not null,
  avatar text not null default '#64748b',                -- สีพื้นหลัง avatar
  persona text,                                          -- เฉพาะข้อมูลจำลอง ห้ามส่งให้ client/AI
  ucenter_package text not null default 'None',
  joined_at date not null default current_date,
  points integer not null default 0 check (points >= 0),
  presale_boost integer not null default 0,
  past_concerts integer not null default 0,
  quiz_score integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.transactions (
  id text primary key,
  user_id text not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('card_purchase', 'upay_transfer', 'swap', 'self_transfer')),
  amount_thb numeric not null,
  merchant text,
  merchant_category text,
  counterparty_id text,
  ts timestamptz not null
);
create index transactions_user_id_idx on public.transactions (user_id);

create table public.rewards (
  id text primary key,
  name text not null,
  cost_points integer not null,
  type text not null check (type in ('discount', 'presale_boost', 'fan_membership', 'merch'))
);

create table public.concerts (
  id text primary key,
  organizer_id text not null references public.organizers (id),
  artist text not null,
  title text not null,
  venue text not null,
  date timestamptz not null,
  sales_open_at timestamptz not null,
  status text not null check (status in ('draft', 'published')),
  plan text not null check (plan in ('basic', 'pro')),
  max_tickets_per_user integer not null,
  template text not null,
  description text,
  zones jsonb not null,
  sections jsonb not null,
  stage jsonb,
  background jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bookings (
  id text primary key,
  code text not null unique,
  user_id text not null references public.profiles (id) on delete cascade,
  concert_id text not null references public.concerts (id) on delete cascade,
  items jsonb not null,
  status text not null check (status in ('held', 'paid', 'cancelled', 'expired')),
  created_at timestamptz not null default now(),
  hold_expires_at timestamptz not null,
  paid_at timestamptz,
  subtotal integer not null,
  service_fee integer not null,
  discount integer not null default 0,
  discount_reward_id text references public.rewards (id),
  total integer not null,
  organizer_commission integer not null
);
create index bookings_concert_status_idx on public.bookings (concert_id, status);
create index bookings_user_idx on public.bookings (user_id);

-- ที่นั่งที่ถูกล็อก/ขายแล้ว: primary key กันการจองที่นั่งเดียวกันซ้ำ แม้มีหลาย server พร้อมกัน
create table public.seat_locks (
  concert_id text not null,
  seat_id text not null,
  booking_id text not null references public.bookings (id) on delete cascade,
  primary key (concert_id, seat_id)
);
create index seat_locks_booking_idx on public.seat_locks (booking_id);

create table public.redemptions (
  id bigserial primary key,
  user_id text not null references public.profiles (id) on delete cascade,
  reward_id text not null references public.rewards (id),
  booking_id text references public.bookings (id) on delete set null,
  at timestamptz not null default now()
);

-- บัญชีที่ AI กันไม่ให้ซื้อ (นับไม่ซ้ำต่อคอน)
create table public.blocked_attempts (
  concert_id text not null references public.concerts (id) on delete cascade,
  user_id text not null references public.profiles (id) on delete cascade,
  at timestamptz not null default now(),
  primary key (concert_id, user_id)
);

-- เช็คอินหน้างาน: ticket_id = "<รหัสจอง>-<ลำดับ>" เช็คอินได้ครั้งเดียว
create table public.checkins (
  ticket_id text primary key,
  booking_id text not null references public.bookings (id) on delete cascade,
  item_index integer not null,
  concert_id text not null references public.concerts (id) on delete cascade,
  staff_id text references public.profiles (id) on delete set null,
  at timestamptz not null default now()
);

alter table public.organizers enable row level security;
alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.rewards enable row level security;
alter table public.concerts enable row level security;
alter table public.bookings enable row level security;
alter table public.seat_locks enable row level security;
alter table public.redemptions enable row level security;
alter table public.blocked_attempts enable row level security;
alter table public.checkins enable row level security;

-- ---------------------------------------------------------------- ฟังก์ชัน (ทำงานครบทั้งชุดหรือไม่ทำเลย)

-- ล็อกที่นั่ง: ยกเลิกที่ค้างของผู้ใช้คนนี้, ปล่อยที่หมดเวลา, ตรวจจำนวนบัตร/ความจุโซนยืน แล้วสร้างการจอง + ล็อกที่นั่ง
-- p_standing: [{ "section_id": "VIP", "qty": 2, "available": 120 }] (available = ความจุหลังหักยอดขายตั้งต้น)
create or replace function public.place_hold(p_booking jsonb, p_seats text[], p_standing jsonb, p_max integer)
returns public.bookings
language plpgsql
set search_path = public
as $$
declare
  b public.bookings;
  v_user text := p_booking ->> 'user_id';
  v_concert text := p_booking ->> 'concert_id';
  v_used integer;
  v_taken integer;
  s jsonb;
begin
  -- ทำทีละคำขอต่อคอน (กันแย่งโซนยืนพร้อมกัน)
  perform 1 from public.concerts where id = v_concert for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  update public.bookings set status = 'expired'
    where concert_id = v_concert and status = 'held' and hold_expires_at < now();
  update public.bookings set status = 'cancelled'
    where concert_id = v_concert and user_id = v_user and status = 'held';
  delete from public.seat_locks l using public.bookings bk
    where l.booking_id = bk.id and bk.concert_id = v_concert and bk.status in ('expired', 'cancelled');

  select coalesce(sum(jsonb_array_length(items)), 0) into v_used
    from public.bookings where concert_id = v_concert and user_id = v_user and status = 'paid';
  if v_used + jsonb_array_length(p_booking -> 'items') > p_max then
    raise exception 'LIMIT:%', v_used using errcode = 'P0001';
  end if;

  for s in select * from jsonb_array_elements(coalesce(p_standing, '[]'::jsonb)) loop
    select count(*) into v_taken
      from public.bookings bk, jsonb_array_elements(bk.items) it
      where bk.concert_id = v_concert and bk.status in ('held', 'paid')
        and it ->> 'sectionId' = s ->> 'section_id' and it ->> 'seatId' is null;
    if v_taken + (s ->> 'qty')::integer > (s ->> 'available')::integer then
      raise exception 'STANDING:%:%', s ->> 'section_id', greatest((s ->> 'available')::integer - v_taken, 0) using errcode = 'P0001';
    end if;
  end loop;

  insert into public.bookings select * from jsonb_populate_record(null::public.bookings, p_booking) returning * into b;
  if array_length(p_seats, 1) > 0 then
    insert into public.seat_locks (concert_id, seat_id, booking_id) select v_concert, unnest(p_seats), b.id;
  end if;
  return b;
end;
$$;

-- ชำระเงิน: หักแต้ม (ถ้าใช้ส่วนลด) + บันทึกการแลก + เปลี่ยนสถานะเป็น paid
create or replace function public.confirm_booking(p_id text, p_user text, p_reward text, p_discount integer, p_cost integer)
returns public.bookings
language plpgsql
set search_path = public
as $$
declare
  b public.bookings;
  v_discount integer := 0;
begin
  select * into b from public.bookings where id = p_id and user_id = p_user for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if b.status <> 'held' then
    raise exception 'NOT_HELD:%', b.status using errcode = 'P0001';
  end if;
  if b.hold_expires_at < now() then
    raise exception 'EXPIRED' using errcode = 'P0001';
  end if;
  if p_reward is not null then
    update public.profiles set points = points - p_cost where id = p_user and points >= p_cost;
    if not found then
      raise exception 'POINTS' using errcode = 'P0001';
    end if;
    insert into public.redemptions (user_id, reward_id, booking_id) values (p_user, p_reward, p_id);
    v_discount := least(p_discount, b.subtotal);
  end if;
  update public.bookings
    set status = 'paid', paid_at = now(), discount = v_discount, discount_reward_id = p_reward,
        total = subtotal - v_discount + service_fee
    where id = p_id
    returning * into b;
  return b;
end;
$$;

create or replace function public.cancel_booking(p_id text, p_user text)
returns public.bookings
language plpgsql
set search_path = public
as $$
declare
  b public.bookings;
begin
  update public.bookings set status = 'cancelled' where id = p_id and user_id = p_user and status = 'held' returning * into b;
  if b.id is not null then
    delete from public.seat_locks where booking_id = p_id; -- ปล่อยเฉพาะที่ยังไม่ชำระ
  else
    select * into b from public.bookings where id = p_id and user_id = p_user;
  end if;
  return b;
end;
$$;

-- แลกแต้มนอกการซื้อบัตร (Presale Boost ใช้ได้ครั้งเดียว)
create or replace function public.redeem_reward(p_user text, p_reward text, p_cost integer, p_boost integer)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_points integer;
begin
  if p_boost > 0 then
    update public.profiles set presale_boost = p_boost where id = p_user and presale_boost = 0;
    if not found then
      raise exception 'BOOST_USED' using errcode = 'P0001';
    end if;
  end if;
  update public.profiles set points = points - p_cost where id = p_user and points >= p_cost returning points into v_points;
  if not found then
    raise exception 'POINTS' using errcode = 'P0001';
  end if;
  insert into public.redemptions (user_id, reward_id) values (p_user, p_reward);
  return v_points;
end;
$$;

revoke execute on function public.place_hold(jsonb, text[], jsonb, integer) from public, anon, authenticated;
revoke execute on function public.confirm_booking(text, text, text, integer, integer) from public, anon, authenticated;
revoke execute on function public.cancel_booking(text, text) from public, anon, authenticated;
revoke execute on function public.redeem_reward(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.place_hold(jsonb, text[], jsonb, integer) to service_role;
grant execute on function public.confirm_booking(text, text, text, integer, integer) to service_role;
grant execute on function public.cancel_booking(text, text) to service_role;
grant execute on function public.redeem_reward(text, text, integer, integer) to service_role;
