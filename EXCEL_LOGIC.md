# EXCEL_LOGIC.md

Audit souboru `Kalkulačka aktuální.xls` a převod obchodní logiky do aplikace Zlato Aurelius.

Zdroj: binární `.xls`, vytvořen 2011, naposledy uložen 28. 7. 2026. 17 listů.

---

## 1. Přehled listů

| List | Role | Stav |
|---|---|---|
| `Zástavy AU` | zlato – zástava i výkup | **aktivní, referenční** |
| `Zástavy AU prodej` | zlato – prodejní ceník | aktivní |
| `Zástavy AG` | stříbro | aktivní, jiný layout |
| `Zástavy AG prodej` | stříbro – prodej | aktivní |
| `Zástavy Pt` | platina | aktivní |
| `Zástavy Pd` | palladium | aktivní |
| `Haas AU`, `Kvapil AG`, `Kvapil AU`, `Ehrenberger`, `Morchiladze`, `Červenka`, `Mrlina`, `Fiala`, `Hrabětová`, `Kurinová` | kopie šablony pro konkrétní zákazníky | **zastaralé** |
| `Nastavení` | sazby a převodní tabulky | částečně mrtvý |

### Listy pojmenované po lidech

Deset listů jsou kopie šablony vytvořené pro konkrétní zákazníky. Jejich cenové konstanty jsou historické — výkup 14K mezi 490 a 500 Kč/g, zatímco aktuální list má **1 535 Kč/g**. Jde tedy o ceny staré řádově roky.

V aplikaci je nahradí záznamy v `loan_contracts`. Kopírování listu jako způsob založení smlouvy zaniká.

---

## 2. Pojmenované oblasti

| Název | Rozsah | Účel |
|---|---|---|
| `Urok` | `Nastavení!C2:D6` | tabulka pro VLOOKUP úrokové sazby podle částky |
| `Tyden` | `Nastavení!G2:H22` | tabulka pro VLOOKUP převodu dní na týdny |

---

## 3. Zástava — výpočet nové smlouvy

Vzorce z `Zástavy AU`, blok „Nová zástavní smlouva" (řádek 7–8).

### 3.1 Datum plnění

```
datum_plnění = počáteční_datum + počet_dní
```

Výchozí počáteční datum je `TODAY()`. Výchozí délka **28 dní**.

### 3.2 Počet týdnů

```
počet_týdnů = VLOOKUP(počet_dní, Tyden, 2)
```

VLOOKUP v přibližném režimu — hledá nejbližší nižší hranici.

Tabulka `Tyden` (hranice dní → počet týdnů):

```
0→1, 8→2, 17→3, 22→4, 29→5, 36→6, 43→7, 50→8, 57→9, 64→10,
71→11, 78→12, 85→13, 92→14, 99→15, 106→16, 113→17, 120→18,
127→19, 134→20
```

⚠️ **Viz nález č. 1.**

### 3.3 Týdenní úroková sazba

```
sazba_týden = ruční_override ≠ prázdné
              ? ruční_override
              : VLOOKUP(částka_půjčky, Urok, 2)
```

Tabulka `Urok`:

| Od částky | Sazba / týden | Sazba / měsíc |
|---|---|---|
| 0 | 3,0 % | 12 % |
| 5 000 | 2,5 % | 10 % |
| 10 000 | 2,0 % | 8 % |
| 20 000 | 1,5 % | 6 % |

Měsíční sazba je u prvních dvou pásem počítaná jako `týdenní × 4`, u zbylých dvou zapsaná natvrdo. Výsledek je shodný.

Ruční override týdenní sazby je v buňce `J45` („Jiná částka úroku za týden") a má přednost před tabulkou. **V aplikaci zachovat** jako volitelné pole viditelné jen zaměstnanci.

### 3.4 Celková sazba a úrok

```
sazba_celkem = počet_týdnů × sazba_týden
úrok_hrubý   = částka_půjčky × sazba_celkem
úrok         = MAX(úrok_hrubý, minimální_úrok)
```

Minimální úrok = **50 Kč** (`Nastavení!J3`).

⚠️ **Viz nálezy č. 2 a 3.**

### 3.5 Částka k vrácení

```
k_vrácení = částka_půjčky + úrok
```

Kontrolní příklad z listu: půjčka 1 800 Kč, 28 dní → 4 týdny, sazba 3 %/týden → celková sazba 12 % → úrok 216 Kč → k vrácení **2 016 Kč**.

---

## 4. Ukončení / předčasné splacení

Blok řádků 31–43. Logika je jiná než u nové smlouvy.

```
počáteční_datum = splatné_dne − 28
počet_dní       = datum_ukončení − počáteční_datum
počet_týdnů     = CEILING(počet_dní / 7, 1)
```

Datum ukončení je `TODAY()`, pokud není zadáno předpokládané datum uhrazení.

⚠️ **Zde se týdny počítají zaokrouhlením nahoru, ne tabulkou `Tyden`.** Dva různé způsoby převodu dní na týdny v jednom listu. Viz nález č. 1.

Poznámka v listu u tohoto bloku: *„Počítají se pouze úroky za 28 dní."*

---

## 5. Výkup a zástava kovů

### 5.1 Základní vzorec

Shodný pro všechny kovy:

```
cena = (referenční_cena_za_gram / referenční_ryzost) × ryzost_položky × váha
```

Referenční dvojice je uložena přímo v listu, ne v `Nastavení`.

Vedle toho se počítá hmotnost ryzího kovu:

```
ryzí_kov_g = (ryzost × váha) / 1000
```

A převod ryzosti na karáty:

```
karáty = ryzost / 41,67
```

### 5.2 Referenční ceny (stav k datu auditu)

| List | Ref. ryzost | Výkup Kč/g | Zástava Kč/g |
|---|---|---|---|
| Zástavy AU | 585 | 1 535 | 680 |
| Zástavy AU prodej | 585 | 1 575 | 440 |
| Zástavy AG | 999 | 40 | 8 |
| Zástavy Pt | 999 | 500 | 300 |
| Zástavy Pd | 999 | 250 | 200 |

Ceny jsou zapsané natvrdo v každém listu zvlášť. Hodnoty v `Nastavení!L3` (440) a `Nastavení!N3` (400) **nejsou nikde použity** — jde o mrtvé buňky.

### 5.3 Ryzosti

**Stříbro** má korektní číselník: 800, 900, 925, 999.

**Zlato** číselník nemá. Má pět volných řádků, které pracovník přepisuje. Aktuální obsah:

| Popisek | Ryzost | Správně |
|---|---|---|
| 6K | 250 | 250 ✓ |
| 8K | 585 | 333 ✗ |
| 14 | 750 | 585 ✗ |
| 18 | 631 | 750 ✗ |
| 24K | 900 | 999 ✗ |
| Jiný | 651 / 550 / 916 | volné |

⚠️ **Viz nález č. 4.**

---

## 6. Nalezené chyby a nekonzistence

### Nález 1 — nekonzistentní převod dní na týdny

Tabulka `Tyden` má hranice 0, 8, **17**, 22, 29, 36… Od 22 výš jde pravidelně po sedmi. Hodnota 17 pattern porušuje; podle logiky (týden 3 = dny 15–21) tam má být **15**.

Důsledek: zákazník splácející 15. nebo 16. den platí 2 týdny místo 3.

Navíc blok ukončení používá `CEILING(dny/7)`, což dává jiné výsledky než tabulka.

**Doporučení:** jeden výpočet pro celou aplikaci. Tabulku ponechat jako konfigurovatelnou v administraci, výchozí hodnoty opravené. **Čeká na rozhodnutí.**

### Nález 2 — minimální úrok se uplatní jen na prvním řádku

Vzorce pro minimální úrok odkazují postupně na `Nastavení!J3`, `J6`, `J9`, `J12`, `J15`. Hodnotu 50 Kč obsahuje **pouze J3**; ostatní buňky jsou prázdné, takže minimum tam vychází 0.

Jde o chybu vzniklou tažením vzorce dolů.

**Doporučení:** minimální úrok uplatnit vždy. Neopakovat chybu.

### Nález 3 — minimum je popsáno jako týdenní, počítá se jako celkové

Popisek zní „Min. částka úroků / týden = 50". Vzorec ale porovnává **celkový** úrok s 50 Kč, ne úrok × počet týdnů.

**Doporučení:** ujasnit záměr. V administraci nabídnout obě varianty (paušální minimum / minimum za týden). **Čeká na rozhodnutí.**

### Nález 4 — ryzosti zlata nesedí na popisky

Viz 5.3. Pracovník musí správnou ryzost hlídat hlavou.

**Doporučení:** pevný číselník + volitelná vlastní ryzost.

### Nález 5 — ceny roztroušené po listech

Změna ceny zlata znamená ruční úpravu na 16 místech.

**Doporučení:** jedna centrální hodnota v administraci, ostatní se dopočítají.

### Nález 6 — chybové hodnoty v listu

Buňky `P46` a `R46` na listu `Zástavy AU` vracejí `#VALUE!`.

**Doporučení:** v aplikaci nemůže nastat, validace ošetří prázdné vstupy.

---

## 7. Seznam TypeScript funkcí

Každá funkce dostane vlastní unit test.

### `lib/calculations/loan.ts`

| Funkce | Vstup | Výstup |
|---|---|---|
| `daysToWeeks` | dny, převodní tabulka | počet týdnů |
| `resolveWeeklyRate` | částka, tabulka sazeb, override? | sazba |
| `calculateInterest` | částka, týdny, sazba, min. úrok | úrok |
| `calculateTotalDue` | částka, úrok | k vrácení |
| `calculateDueDate` | počátek, dny | datum plnění |
| `calculateLoan` | vstupy smlouvy | kompletní výsledek |

### `lib/calculations/settlement.ts`

| Funkce | Účel |
|---|---|
| `calculateElapsedDays` | dny od počátku k datu vyrovnání |
| `calculateSettlement` | předčasné/pozdní ukončení |

### `lib/calculations/extension.ts`

| Funkce | Účel |
|---|---|
| `calculateExtension` | přepočet po prodloužení |
| `sumExtensionHistory` | kumulativní úrok napříč dodatky |

### `lib/calculations/metals.ts`

| Funkce | Účel |
|---|---|
| `pricePerMillesimeGram` | referenční cena → cena za promile/gram |
| `calculateItemPrice` | cena položky |
| `calculatePureWeight` | hmotnost ryzího kovu |
| `millesimalToKarat` | ryzost → karáty |
| `calculateBatch` | součet položek |

### `lib/calculations/rounding.ts`

Zaokrouhlování na celé koruny. Excel nezaokrouhluje vůbec (viz 518,148148 Kč u stříbra) — v aplikaci zaokrouhlíme až výsledek, mezivýpočty v plné přesnosti.

---

## 8. Datový model (D1)

```
settings          klíč/hodnota — sazby, ceny kovů, minima, převodní tabulka
metal_prices      kov, referenční ryzost, cena výkup, cena zástava, platnost od
purities          kov, ryzost, popisek, pořadí, aktivní

users             role ADMIN | EMPLOYEE
customers         jméno, příjmení, kontakt, identifikační údaje
loan_contracts    číslo, zákazník, částka, datum, dny, týdny, sazba, úrok, stav
loan_extensions   vazba na smlouvu, nové datum, přepočtený úrok, pořadí
loan_items        položky zástavy — kov, ryzost, váha, cena
metal_purchases   realizovaný výkup na pobočce
purchase_items    položky výkupu
preorders         veřejná předobjednávka, stav, kontakt
preorder_items    položky předobjednávky
audit_log         kdo, co, kdy, předchozí hodnota
```

Každá tabulka: `id` (UUID), `created_at`, `updated_at`.

Historie se nemaže — smlouvy i dodatky se pouze uzavírají změnou stavu.

Cenové hodnoty ukládat jako **celé haléře (integer)**, ne float.

---

## 9. Architektura

```
src/
  components/      UI prvky
  pages/           obrazovky
  routes/          Worker API endpointy
  lib/
    calculations/  čistá výpočetní logika, bez UI
    validation/    Zod schémata, server-side
    email/         šablony a odesílání
    database/      dotazy nad D1
    types/
  styles/
tests/             unit testy výpočtů
migrations/        D1 migrace
docs/
```

Výpočetní jádro nezná React ani D1 — jsou to čisté funkce nad vstupy. Stejné funkce používá interní kalkulačka i veřejný formulář, takže se výsledky nemohou rozejít.

Veřejný formulář nikdy nepočítá závaznou cenu. Frontend ukazuje orientaci, server vždy přepočítá znovu.

---

## 10. Otevřená rozhodnutí

1. **Převod dní na týdny** — opravit hranici 17 → 15, nebo zachovat současný stav?
2. **Minimální úrok** — paušálních 50 Kč za smlouvu, nebo 50 Kč za každý týden?
3. **Evidence výkupu** — jaké údaje požaduje právník a zda kopii dokladu, nebo opis.
