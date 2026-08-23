-- CreateIndex
CREATE UNIQUE INDEX "event_registrations_event_id_participant_id_key" ON "event_registrations"("event_id", "participant_id");
