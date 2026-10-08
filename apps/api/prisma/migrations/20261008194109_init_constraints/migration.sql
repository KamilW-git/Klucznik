-- Constrainty, których Prisma nie modeluje (apps/api/docs/persistence-layer.md#migracje).
-- Nie edytuj po wypchnięciu do repo: zmiana oznacza nową migrację.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Rezerwacje ------------------------------------------------------------------

-- BR-04: wyjazd po przyjeździe.
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_check_dates" CHECK ("check_out" > "check_in");

-- BR-02: co najmniej jeden gość.
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_check_guests" CHECK ("guests_count" >= 1);

-- BR-05: cena w groszach, nieujemna.
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_check_total_price" CHECK ("total_price" >= 0);

-- BR-01: aktywne rezerwacje pokoju nie nakładają się (pobyt półotwarty [check_in, check_out)).
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_no_overlap"
  EXCLUDE USING gist ("room_id" WITH =, daterange("check_in", "check_out", '[)') WITH &&)
  WHERE ("status" IN ('PENDING', 'CONFIRMED'));

-- Stawki sezonowe -------------------------------------------------------------

ALTER TABLE "seasonal_rates" ADD CONSTRAINT "seasonal_rates_check_dates" CHECK ("date_to" >= "date_from");
ALTER TABLE "seasonal_rates" ADD CONSTRAINT "seasonal_rates_check_price" CHECK ("price_per_night" >= 0);
ALTER TABLE "seasonal_rates" ADD CONSTRAINT "seasonal_rates_check_min_nights" CHECK ("min_nights" IS NULL OR "min_nights" >= 1);

-- BR-09: stawki sezonowe pokoju nie nakładają się (noce włącznie [date_from, date_to]).
ALTER TABLE "seasonal_rates" ADD CONSTRAINT "seasonal_rates_no_overlap"
  EXCLUDE USING gist ("room_id" WITH =, daterange("date_from", "date_to", '[]') WITH &&);

-- Blokady i pokoje ------------------------------------------------------------

ALTER TABLE "availability_blocks" ADD CONSTRAINT "availability_blocks_check_dates" CHECK ("date_to" >= "date_from");

-- BR-02, BR-03, BR-05: pojemność, minimalny pobyt i cena bazowa.
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_check_capacity" CHECK ("capacity" >= 1);
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_check_min_nights" CHECK ("min_nights" >= 1);
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_check_base_price" CHECK ("base_price_per_night" >= 0);
