# Zlato Aurelius – kalkulačka

Cloudflare Worker s kalkulačkou výkupu a zástavy drahých kovů.
Výpočetní logika převzatá z původní Excelové kalkulačky, viz `EXCEL_LOGIC.md`.

- `/` – veřejná kalkulačka
- `/admin` – nastavení cen kovů

## Nasazení

Spouštěj v kořeni projektu.

### 1. Závislosti

```bash
npm install
```

### 2. Vytvoření databáze

```bash
npx wrangler login
npx wrangler d1 create aurry-kalkulacka
```

Příkaz vypíše `database_id`. Zkopíruj ho do `wrangler.jsonc` místo
`SEM_VLOZ_ID_Z_PRIKAZU_D1_CREATE`.

### 3. Naplnění databáze

```bash
npx wrangler d1 execute aurry-kalkulacka --remote --file=./schema.sql
```

### 4. Administrátorský klíč

```bash
npx wrangler secret put ADMIN_KEY
```

Zadej dlouhé náhodné heslo. Nikam ho neukládej do repozitáře.

### 5. Nasazení

```bash
npx wrangler deploy
```

Nebo prostě `git push` – Cloudflare Workers Builds nasadí automaticky.

## Testy

```bash
node test.mjs
```

Testy porovnávají výsledky s kontrolními hodnotami odečtenými přímo z Excelu.

## Doména

V Cloudflare: Workers & Pages → kalkulacka → Domains → Add custom domain →
`kalkulacka.aurry.cz`. DNS záznam se vytvoří sám a proxy u něj zůstává zapnutý.

## Zabezpečení adminu

Dočasně chrání `/admin` klíč v hlavičce `x-admin-key`.

Cílové řešení je Cloudflare Zero Trust → Access: aplikace na
`kalkulacka.aurry.cz/admin`, povolené jen konkrétní e-mailové adresy.
Worker už hlavičku `cf-access-authenticated-user-email` rozpoznává, takže po
nastavení Accessu bude přihlášení fungovat bez dalších zásahů do kódu.
