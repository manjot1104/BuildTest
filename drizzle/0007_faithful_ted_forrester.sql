-- Add new enum values
ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'team_member';

-- Step 1: Add new array column
ALTER TABLE "user"
ADD COLUMN "roles" user_role[] DEFAULT ARRAY['user']::user_role[] NOT NULL;

-- Step 2: Copy old data into array
UPDATE "user"
SET "roles" = ARRAY["role"];

-- Step 3: Drop old column
ALTER TABLE "user"
DROP COLUMN "role";