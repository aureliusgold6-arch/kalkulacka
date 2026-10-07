-- Zlato Aurelius – schéma databáze
-- Hodnoty vycházejí z auditu Excelu (viz EXCEL_LOGIC.md)

DROP TABLE IF EXISTS metals;
DROP TABLE IF EXISTS purities;
DROP TABLE IF EXISTS settings;

-- Kovy a jejich referenční ceny
-- Vzorec: cena = (ref_price / ref_purity) * ryzost * vaha
CREATE TABLE metals (
  code        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  ref_purity  INTEGER NOT NULL,
  price_buy   REAL NOT NULL,
  price_pawn  REAL NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Číselník ryzostí
CREATE TABLE purities (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  metal_code  TEXT NOT NULL REFERENCES metals(code),
  purity      INTEGER NOT NULL,
  label       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- Obecné parametry
CREATE TABLE settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  label       TEXT NOT NULL,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Referenční ceny ze stavu Excelu k datu auditu
INSERT INTO metals (code, name, ref_purity, price_buy, price_pawn, sort_order) VALUES
  ('AU', 'Zlato',     585, 1535, 680, 1),
  ('AG', 'Stříbro',   999,   40,   8, 2),
  ('PT', 'Platina',   999,  500, 300, 3),
  ('PD', 'Palladium', 999,  250, 200, 4);

-- Ryzosti zlata – opravený číselník (Excel měl popisky nesedící na hodnoty)
INSERT INTO purities (metal_code, purity, label, sort_order) VALUES
  ('AU', 333, '8K (333)',    1),
  ('AU', 375, '9K (375)',    2),
  ('AU', 585, '14K (585)',   3),
  ('AU', 750, '18K (750)',   4),
  ('AU', 900, '21,6K (900)', 5),
  ('AU', 999, '24K (999)',   6),
  ('AG', 800, '800',  1),
  ('AG', 900, '900',  2),
  ('AG', 925, '925',  3),
  ('AG', 999, '999',  4),
  ('PT', 950, '950',  1),
  ('PT', 999, '999',  2),
  ('PD', 500, '500',  1),
  ('PD', 950, '950',  2),
  ('PD', 999, '999',  3);

INSERT INTO settings (key, value, label) VALUES
  ('min_interest',   '50',   'Minimální úrok (Kč za smlouvu)'),
  ('rounding',       '1',    'Zaokrouhlení výsledné ceny (Kč)'),
  ('public_enabled', '1',    'Veřejná kalkulačka zapnutá (1/0)');
