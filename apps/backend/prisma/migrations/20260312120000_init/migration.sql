-- CreateTable
CREATE TABLE "users" (
    "telegram_id" BIGINT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "phone" TEXT,
    "yclients_client_id" INTEGER,
    "pd_consent" BOOLEAN NOT NULL DEFAULT false,
    "pd_consent_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_visit" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("telegram_id")
);

-- CreateTable
CREATE TABLE "bookings_log" (
    "id" TEXT NOT NULL,
    "telegram_id" BIGINT NOT NULL,
    "yclients_record_id" INTEGER,
    "master_id" INTEGER NOT NULL,
    "services" TEXT NOT NULL,
    "booking_date" TIMESTAMP(3) NOT NULL,
    "booking_time" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total_price" INTEGER NOT NULL,
    "total_duration" INTEGER NOT NULL,
    "reminder_24h_sent" BOOLEAN NOT NULL DEFAULT false,
    "reminder_2h_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bookings_log_telegram_id_idx" ON "bookings_log"("telegram_id");

-- CreateIndex
CREATE INDEX "bookings_log_status_booking_date_idx" ON "bookings_log"("status", "booking_date");

-- CreateIndex
CREATE INDEX "bookings_log_yclients_record_id_idx" ON "bookings_log"("yclients_record_id");

-- AddForeignKey
ALTER TABLE "bookings_log" ADD CONSTRAINT "bookings_log_telegram_id_fkey" FOREIGN KEY ("telegram_id") REFERENCES "users"("telegram_id") ON DELETE RESTRICT ON UPDATE CASCADE;
