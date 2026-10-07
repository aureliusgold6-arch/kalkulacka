/**
 * Zlato Aurelius – výpočetní jádro
 *
 * Čisté funkce bez vazby na UI nebo databázi.
 * Odpovídají vzorcům z původního Excelu, viz EXCEL_LOGIC.md
 */

/**
 * Cena položky podle vzorce z Excelu:
 *   cena = (referenční_cena / referenční_ryzost) * ryzost * váha
 */
export function calculateItemPrice(refPrice, refPurity, purity, weightGrams) {
  if (!refPurity || refPurity <= 0) return 0;
  if (!weightGrams || weightGrams <= 0) return 0;
  if (!purity || purity <= 0) return 0;
  return (refPrice / refPurity) * purity * weightGrams;
}

/** Hmotnost ryzího kovu v gramech */
export function calculatePureWeight(purity, weightGrams) {
  if (!purity || !weightGrams) return 0;
  return (purity * weightGrams) / 1000;
}

/** Převod ryzosti v promile na karáty */
export function millesimalToKarat(purity) {
  return purity / 41.67;
}

/** Zaokrouhlení výsledku na celé koruny (mezivýpočty zůstávají přesné) */
export function roundPrice(value, step = 1) {
  if (!step || step <= 0) return value;
  return Math.round(value / step) * step;
  
}
