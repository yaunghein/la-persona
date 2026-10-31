-- Better Auth stores multiple roles comma-separated, so replace the token rather than the whole value.
UPDATE "member" SET "role" = array_to_string(array_replace(string_to_array("role", ','), 'owner', 'admin'), ',') WHERE 'owner' = ANY(string_to_array("role", ','));--> statement-breakpoint
UPDATE "invitation" SET "role" = array_to_string(array_replace(string_to_array("role", ','), 'owner', 'admin'), ',') WHERE 'owner' = ANY(string_to_array("role", ','));
