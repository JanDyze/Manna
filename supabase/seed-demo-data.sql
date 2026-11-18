-- Fills one account with a realistic month of sample data for trying Manna on the LOCAL database.
-- Change the email below, then run it in Supabase Studio's SQL editor (http://127.0.0.1:54323).
-- Dates are relative to today. It refuses to run if the account already has transactions,
-- so it never mixes sample data into real records.
do $$
declare
  who text := 'jdmalaluan2@gmail.com';
  u uuid;
  t date := current_date;
  m date := date_trunc('month', current_date)::date;
  dom int := extract(day from current_date)::int;
  wallet uuid; gcash uuid; bank uuid;
  p_joy uuid; p_marco uuid; p_paolo uuid;
  d_joy uuid; d_marco uuid; d_paolo uuid;
  g_fund uuid; g_xmas uuid; g_laptop uuid;
  r_rent uuid; r_meralco uuid;
begin
  select id into u from auth.users where email = who;
  if u is null then raise exception 'No user with email %', who; end if;
  if exists (select 1 from manna.transactions where user_id = u) then
    raise exception '% already has transactions; not adding sample data', who;
  end if;

  -- the same starter rows the app creates on first sign-in
  insert into manna.settings (user_id) values (u) on conflict (user_id) do nothing;
  insert into manna.categories (user_id, kind, name, icon, sort) values
    (u, 'expense', 'Food', 'food', 0), (u, 'expense', 'Transport', 'transport', 1), (u, 'expense', 'Bills', 'bolt', 2),
    (u, 'expense', 'Rent', 'home', 3), (u, 'expense', 'Groceries', 'basket', 4), (u, 'expense', 'Health', 'heart', 5),
    (u, 'expense', 'Family', 'people', 6), (u, 'expense', 'Shopping', 'bag', 7), (u, 'expense', 'Fun', 'spark', 8),
    (u, 'expense', 'Subscriptions', 'repeat', 9), (u, 'expense', 'Other', 'dot', 10),
    (u, 'income', 'Salary', 'briefcase', 0), (u, 'income', 'Side work', 'tool', 1), (u, 'income', 'Gift', 'gift', 2), (u, 'income', 'Other', 'dot', 3),
    (u, 'giving', 'Tithe', 'wheat', 0), (u, 'giving', 'Offering', 'envelope', 1), (u, 'giving', 'Missions', 'globe', 2), (u, 'giving', 'Helping others', 'heart', 3)
  on conflict (user_id, kind, name) do nothing;

  select id into wallet from manna.accounts where user_id = u and name = 'Wallet';
  if wallet is null then insert into manna.accounts (user_id, name, kind, sort) values (u, 'Wallet', 'cash', 0) returning id into wallet; end if;
  select id into gcash from manna.accounts where user_id = u and name = 'GCash';
  if gcash is null then insert into manna.accounts (user_id, name, kind, sort) values (u, 'GCash', 'ewallet', 1) returning id into gcash; end if;
  -- no generic "Bank" in the sample: salary, rent and bills go through GCash
  bank := gcash;
  update manna.accounts set opening_balance = case id when wallet then 1800 else 14300 end where id in (wallet, gcash);

  create temp table c on commit drop as select kind, name, id from manna.categories where user_id = u;

  insert into manna.budgets (user_id, category_id, amount)
  select u, c.id, b.amount from (values ('Food', 6000), ('Transport', 2500), ('Groceries', 4000), ('Bills', 3500), ('Fun', 1500), ('Shopping', 2000), ('Subscriptions', 1200)) b(name, amount)
  join c on c.kind = 'expense' and c.name = b.name
  on conflict (user_id, category_id) do nothing;

  insert into manna.recurring (user_id, title, kind, amount, account_id, category_id, frequency, next_due, note) values
    (u, 'Rent', 'expense', 8500, bank, (select id from c where kind = 'expense' and name = 'Rent'), 'monthly', t + 2, null)
    returning id into r_rent;
  insert into manna.recurring (user_id, title, kind, amount, account_id, category_id, frequency, next_due, note) values
    (u, 'Meralco', 'expense', 1850, gcash, (select id from c where kind = 'expense' and name = 'Bills'), 'monthly', t + 6, null)
    returning id into r_meralco;
  insert into manna.recurring (user_id, title, kind, amount, account_id, category_id, frequency, next_due, note) values
    (u, 'Netflix', 'expense', 549, bank, (select id from c where kind = 'expense' and name = 'Subscriptions'), 'monthly', t + 10, null),
    (u, 'PLDT Fiber', 'expense', 1699, bank, (select id from c where kind = 'expense' and name = 'Bills'), 'monthly', t + 15, null),
    (u, 'Salary', 'income', 19000, bank, (select id from c where kind = 'income' and name = 'Salary'), 'monthly', t + 13, '15th and 30th');

  insert into manna.people (user_id, name) values (u, 'Ate Joy') returning id into p_joy;
  insert into manna.people (user_id, name) values (u, 'Marco') returning id into p_marco;
  insert into manna.people (user_id, name) values (u, 'Kuya Paolo') returning id into p_paolo;
  insert into manna.debts (user_id, person_id, direction, title, principal, started_on, due_on) values (u, p_joy, 'owed_to_me', 'Tuition help', 3000, t - 20, t + 27) returning id into d_joy;
  insert into manna.debts (user_id, person_id, direction, title, principal, started_on, due_on) values (u, p_marco, 'owed_to_me', 'Concert ticket', 2500, t - 26, t + 9) returning id into d_marco;
  insert into manna.debts (user_id, person_id, direction, title, principal, started_on, due_on) values (u, p_paolo, 'i_owe', 'Phone repair', 4000, t - 40, t + 12) returning id into d_paolo;

  insert into manna.goals (user_id, name, target, target_on, icon) values (u, 'Emergency fund', 50000, (t + interval '8 months')::date, 'shield') returning id into g_fund;
  insert into manna.goals (user_id, name, target, target_on, icon) values (u, 'Christmas gifts', 6000, make_date(extract(year from t)::int, 12, 20), 'gift') returning id into g_xmas;
  insert into manna.goals (user_id, name, target, target_on, icon) values (u, 'New laptop', 45000, null, 'laptop') returning id into g_laptop;
  insert into manna.goal_entries (user_id, goal_id, amount, occurred_on) values
    (u, g_fund, 15000, t - 60), (u, g_fund, 6000, t - 10), (u, g_xmas, 3500, t - 5), (u, g_laptop, 9000, t - 30);

  -- this month's money, and the loans' history (the same story as the in-app demo)
  insert into manna.transactions (user_id, kind, amount, occurred_on, account_id, to_account_id, category_id, debt_id, recurring_id, note)
  select u, x.kind, x.amount, x.on_day, x.acc, x.to_acc, (select id from c where c.kind = x.ckind and c.name = x.cname), x.debt, x.rec, x.note
  from (values
    ('income',   19000, m,                              bank,   null::uuid, 'income',  'Salary',        null::uuid, null::uuid, 'Salary'),
    ('income',   19000, m + (least(15, dom) - 1),       bank,   null,       'income',  'Salary',        null,       null,       'Salary'),
    ('giving',    1900, m,                              bank,   null,       'giving',  'Tithe',         null,       null,       'Tithe'),
    ('giving',    1900, m + (least(15, dom) - 1),       bank,   null,       'giving',  'Tithe',         null,       null,       'Tithe'),
    ('giving',     500, m + (least(9, dom) - 1),        wallet, null,       'giving',  'Offering',      null,       null,       'Sunday offering'),
    ('expense',   8500, m + (least(2, dom) - 1),        bank,   null,       'expense', 'Rent',          null,       r_rent,     'Rent'),
    ('expense',   1380, m + (least(4, dom) - 1),        bank,   null,       'expense', 'Groceries',     null,       null,       'SM Hypermarket'),
    ('expense',   1240, m + (least(11, dom) - 1),       gcash,  null,       'expense', 'Groceries',     null,       null,       'Puregold'),
    ('expense',    245, t,                              wallet, null,       'expense', 'Food',          null,       null,       'Lunch with the team'),
    ('expense',    186, t,                              gcash,  null,       'expense', 'Transport',     null,       null,       'Grab to the office'),
    ('expense',    165, t - 1,                          wallet, null,       'expense', 'Food',          null,       null,       'Siomai rice'),
    ('expense',    520, t - 2,                          gcash,  null,       'expense', 'Food',          null,       null,       'Jollibee with family'),
    ('expense',   1850, m + (least(6, dom) - 1),        gcash,  null,       'expense', 'Bills',         null,       r_meralco,  'Meralco'),
    ('expense',    549, m + (least(7, dom) - 1),        bank,   null,       'expense', 'Subscriptions', null,       null,       'Netflix'),
    ('expense',    899, m + (least(8, dom) - 1),        gcash,  null,       'expense', 'Fun',           null,       null,       'Movie night'),
    ('expense',    640, m + (least(10, dom) - 1),       gcash,  null,       'expense', 'Shopping',      null,       null,       'Shirt'),
    ('expense',    420, m + (least(12, dom) - 1),       wallet, null,       'expense', 'Transport',     null,       null,       'Jeep and tricycle, week'),
    ('expense',   1100, m + (least(5, dom) - 1),        wallet, null,       'expense', 'Food',          null,       null,       'Groceries for lunch packs'),
    ('debt_out',  3000, t - 20,                         bank,   null,       null,      null,            d_joy,      null,       'Tuition help'),
    ('debt_out',  2500, t - 26,                         bank,   null,       null,      null,            d_marco,    null,       'Concert ticket'),
    ('debt_in',   1000, t - 9,                          gcash,  null,       null,      null,            d_marco,    null,       'Concert ticket'),
    ('debt_in',   4000, t - 40,                         wallet, null,       null,      null,            d_paolo,    null,       'Phone repair'),
    ('debt_out',  2000, t - 12,                         gcash,  null,       null,      null,            d_paolo,    null,       'Phone repair')
  ) as x(kind, amount, on_day, acc, to_acc, ckind, cname, debt, rec, note);

  raise notice 'Sample data added for %', who;
end;
$$;
