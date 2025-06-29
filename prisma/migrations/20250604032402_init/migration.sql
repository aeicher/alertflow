-- CreateTable
CREATE TABLE "incidents" (
    "id" UUID NOT NULL,
    "slack_channel_id" VARCHAR(255) NOT NULL,
    "slack_message_ts" VARCHAR(255) NOT NULL,
    "title" TEXT,
    "severity" VARCHAR(50),
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "raw_logs" TEXT,
    "ai_summary" TEXT,
    "suggested_actions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_queries" (
    "id" UUID NOT NULL,
    "incident_id" UUID,
    "user_id" VARCHAR(255) NOT NULL,
    "query" TEXT NOT NULL,
    "response" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_queries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "incidents_slack_channel_id_idx" ON "incidents"("slack_channel_id");

-- CreateIndex
CREATE INDEX "incidents_slack_message_ts_idx" ON "incidents"("slack_message_ts");

-- CreateIndex
CREATE INDEX "incident_queries_incident_id_idx" ON "incident_queries"("incident_id");

-- AddForeignKey
ALTER TABLE "incident_queries" ADD CONSTRAINT "incident_queries_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
