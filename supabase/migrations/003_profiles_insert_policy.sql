-- Allow authenticated users to insert their own profile row when the DB trigger
-- did not run (legacy projects) or when recovering from a missing row.
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);
