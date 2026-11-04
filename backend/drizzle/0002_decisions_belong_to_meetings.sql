ALTER TABLE "decisions" DROP CONSTRAINT "decisions_summary_id_position_unique";--> statement-breakpoint
ALTER TABLE "decisions" DROP CONSTRAINT "decisions_summary_id_summaries_id_fk";
--> statement-breakpoint
ALTER TABLE "decisions" ALTER COLUMN "summary_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN "meeting_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_summary_id_meeting_id_summaries_id_meeting_id_fk" FOREIGN KEY ("summary_id","meeting_id") REFERENCES "public"."summaries"("id","meeting_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_meeting_id_position_unique" UNIQUE("meeting_id","position");