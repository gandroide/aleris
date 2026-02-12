-- =======================================================
-- TEACHER RLS POLICIES — Portal del Profesor
-- Run in Supabase SQL Editor AFTER enabling RLS on tables
-- =======================================================

-- 1. APPOINTMENTS: Teacher can read their own + academy public ones
-- DROP existing if re-running
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'teacher_read_own_appointments') THEN
    DROP POLICY teacher_read_own_appointments ON appointments;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'teacher_update_own_appointments') THEN
    DROP POLICY teacher_update_own_appointments ON appointments;
  END IF;
END $$;

-- Teacher can SELECT appointments where they are the assigned instructor
CREATE POLICY teacher_read_own_appointments ON appointments
  FOR SELECT
  USING (
    -- Teachers only see their own classes
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'teacher'
      )
      AND (
        profile_id = auth.uid()
        OR professional_id = auth.uid()
      )
    )
    -- Non-teachers use existing org-level policies
    OR NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'teacher'
    )
  );

-- Teacher can UPDATE only their own appointments
CREATE POLICY teacher_update_own_appointments ON appointments
  FOR UPDATE
  USING (
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'teacher'
      )
      AND (
        profile_id = auth.uid()
        OR professional_id = auth.uid()
      )
    )
    OR NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'teacher'
    )
  );


-- 2. TRANSACTIONS: Teachers should NEVER see academy transactions
-- This assumes RLS is already enabled on 'transactions'.
-- We create a policy that excludes teachers.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'deny_teacher_transactions') THEN
    DROP POLICY deny_teacher_transactions ON transactions;
  END IF;
END $$;

-- Allow SELECT only for non-teacher roles
-- If other policies exist for org-level, this adds teacher exclusion
CREATE POLICY deny_teacher_transactions ON transactions
  FOR SELECT
  USING (
    NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'teacher'
    )
  );


-- 3. STUDENTS: Teachers can only see students who attend their classes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'teacher_read_own_students') THEN
    DROP POLICY teacher_read_own_students ON students;
  END IF;
END $$;

CREATE POLICY teacher_read_own_students ON students
  FOR SELECT
  USING (
    -- Teacher: only students in their appointment_attendees
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'teacher'
      )
      AND id IN (
        SELECT aa.student_id
        FROM appointment_attendees aa
        INNER JOIN appointments a ON a.id = aa.appointment_id
        WHERE a.profile_id = auth.uid()
           OR a.professional_id = auth.uid()
      )
    )
    -- Non-teachers use existing org-level policies
    OR NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'teacher'
    )
  );


-- 4. APPOINTMENT_ATTENDEES: Teachers see attendees of their own classes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'teacher_read_own_attendees') THEN
    DROP POLICY teacher_read_own_attendees ON appointment_attendees;
  END IF;
END $$;

CREATE POLICY teacher_read_own_attendees ON appointment_attendees
  FOR SELECT
  USING (
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'teacher'
      )
      AND appointment_id IN (
        SELECT id FROM appointments
        WHERE profile_id = auth.uid()
           OR professional_id = auth.uid()
      )
    )
    OR NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'teacher'
    )
  );
