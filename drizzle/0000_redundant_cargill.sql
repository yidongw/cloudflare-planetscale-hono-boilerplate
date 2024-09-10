DO $$ BEGIN
 CREATE TYPE "public"."role" AS ENUM('user', 'admin');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "authorisation" (
	"provider_type" varchar(255) NOT NULL,
	"provider_user_id" varchar(255) NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "primary_key" PRIMARY KEY("provider_type","provider_user_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"password" varchar(255),
	"email" varchar(255) NOT NULL,
	"is_email_verified" boolean DEFAULT false NOT NULL,
	"role" "role" DEFAULT 'user' NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_provider_user" ON "authorisation" USING btree ("provider_type","provider_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "authorisations_user_id_index" ON "authorisation" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_email_index" ON "user" USING btree ("email");