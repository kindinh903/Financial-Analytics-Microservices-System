-- Update user role to admin in PostgreSQL
UPDATE "AspNetUsers" 
SET "Role" = 'admin' 
WHERE "AspNetUsers"."Email" = 'test@example.com';

-- Verify the update
SELECT "AspNetUsers"."Id", "AspNetUsers"."Email", "AspNetUsers"."FirstName", "AspNetUsers"."LastName", "AspNetUsers"."Role" 
FROM "AspNetUsers" 
WHERE "AspNetUsers"."Email" = 'test@example.com';
