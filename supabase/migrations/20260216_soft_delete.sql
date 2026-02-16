-- 1. Add is_active to students
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Add is_active to available_teachers_view (This likely requires updating the underlying table, probably 'profiles' or 'professionals')
-- Let's assume professionals for now, but also check profiles if needed.
-- It's safer to add to 'profiles' if that's where user data lives, but for 'StaffPage', we need to check where it pulls from.
-- StaffPage uses 'available_teachers_view'. 
-- Let's try to add to 'professionals' first as it seems to be the main table for staff logic in this context, or 'profiles' if they are linked.
-- Given I can't check schema, I'll add to both to be safe or ask user to check.
-- Actually, let's just add to 'profiles' as that's usually the base table for auth users.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Add security_pin to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS security_pin TEXT DEFAULT '1234';

-- 4. Create RLS policies or update view if needed (Optional, usually Views just need a refresh if they select *)
-- If available_teachers_view selects specific columns, it might need recreation.
-- For now, let's assume views are dynamic or robust.
