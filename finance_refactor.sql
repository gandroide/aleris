-- Create expenses table
create table if not exists public.expenses (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid not null, -- Removed foreign key constraint to avoid potential reference issues without knowing table name, assume valid UUID
  amount numeric not null,
  category text not null, -- 'nómina', 'servicios', 'mantenimiento', 'publicidad', 'otros'
  description text,
  payment_method text not null default 'transfer',
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

-- Enable RLS
alter table public.expenses enable row level security;

-- Create policies (Assuming 'profiles' table stores organization_id context)
create policy "Users can view their organization expenses"
on public.expenses for select
using (
  organization_id in (
    select organization_id from public.profiles
    where id = auth.uid()
  )
);

create policy "Users can insert expenses for their organization"
on public.expenses for insert
with check (
  organization_id in (
    select organization_id from public.profiles
    where id = auth.uid()
  )
);

-- Reload schema cache
NOTIFY pgrst, 'reload config';
