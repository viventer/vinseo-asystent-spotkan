CREATE TYPE "public"."participant_role" AS ENUM('employee', 'client');--> statement-breakpoint
CREATE TABLE "meeting_participants" (
	"meeting_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "participant_role" NOT NULL,
	CONSTRAINT "meeting_participants_meeting_id_user_id_pk" PRIMARY KEY("meeting_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organizer_user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recordings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"meeting_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	CONSTRAINT "recordings_meeting_id_unique" UNIQUE("meeting_id"),
	CONSTRAINT "recordings_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"summary_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"text" text NOT NULL,
	"speaker_ids" text[] NOT NULL,
	CONSTRAINT "decisions_summary_id_position_unique" UNIQUE("summary_id","position"),
	CONSTRAINT "decisions_position_non_negative" CHECK ("decisions"."position" >= 0),
	CONSTRAINT "decisions_text_non_empty" CHECK (char_length("decisions"."text") > 0),
	CONSTRAINT "decisions_speaker_ids_elements_non_empty" CHECK (array_position("decisions"."speaker_ids", '') IS NULL AND array_position("decisions"."speaker_ids", NULL) IS NULL)
);
--> statement-breakpoint
CREATE TABLE "summaries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"meeting_id" uuid NOT NULL,
	"text" text NOT NULL,
	CONSTRAINT "summaries_meeting_id_unique" UNIQUE("meeting_id"),
	CONSTRAINT "summaries_text_non_empty" CHECK (char_length("summaries"."text") > 0)
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"summary_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"speaker_id" text NOT NULL,
	"action" text NOT NULL,
	"deadline" date NOT NULL,
	CONSTRAINT "tasks_summary_id_position_unique" UNIQUE("summary_id","position"),
	CONSTRAINT "tasks_position_non_negative" CHECK ("tasks"."position" >= 0),
	CONSTRAINT "tasks_speaker_id_non_empty" CHECK (char_length("tasks"."speaker_id") > 0),
	CONSTRAINT "tasks_action_non_empty" CHECK (char_length("tasks"."action") > 0)
);
--> statement-breakpoint
CREATE TABLE "transcript_segments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"meeting_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"speaker_id" text NOT NULL,
	"start_ms" integer NOT NULL,
	"end_ms" integer NOT NULL,
	"text" text NOT NULL,
	CONSTRAINT "transcript_segments_meeting_id_position_unique" UNIQUE("meeting_id","position"),
	CONSTRAINT "transcript_segments_position_non_negative" CHECK ("transcript_segments"."position" >= 0),
	CONSTRAINT "transcript_segments_speaker_id_non_empty" CHECK (char_length("transcript_segments"."speaker_id") > 0),
	CONSTRAINT "transcript_segments_start_ms_non_negative" CHECK ("transcript_segments"."start_ms" >= 0),
	CONSTRAINT "transcript_segments_end_ms_gte_start_ms" CHECK ("transcript_segments"."end_ms" >= "transcript_segments"."start_ms")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"email" text NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_organizer_user_id_users_id_fk" FOREIGN KEY ("organizer_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_summary_id_summaries_id_fk" FOREIGN KEY ("summary_id") REFERENCES "public"."summaries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "summaries" ADD CONSTRAINT "summaries_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_summary_id_summaries_id_fk" FOREIGN KEY ("summary_id") REFERENCES "public"."summaries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_segments" ADD CONSTRAINT "transcript_segments_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE restrict ON UPDATE no action;