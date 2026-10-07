import { calculateItemPrice, calculatePureWeight, millesimalToKarat, roundPrice } from './src/index.js';
let fail = 0;
function eq(name, got, want, tol = 0.01) {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) fail++;
  console.log((ok ? 'OK  ' : 'CHYBA ') + name + ' -> ' + got + ' (ocekavano ' + want + ')');
}
// Kontrolni priklady prevzate primo z Excelu
eq('AU 585, 12.13 g, vykup 1535', calculateItemPrice(1535, 585, 585, 12.13), 18619.55);
eq('AG 925, 13.99 g, vykup 40',  calculateItemPrice(40, 999, 925, 13.99), 518.148148, 0.001);
eq('AG 800, 5 g, vykup 40',      calculateItemPrice(40, 999, 800, 5), 160.16016, 0.001);
eq('Ryzi zlato 585 x 12.13',     calculatePureWeight(585, 12.13), 7.09605, 0.0001);
eq('Ryzost 585 -> karaty',       millesimalToKarat(585), 14.03, 0.01);
eq('Zaporna vaha',               calculateItemPrice(1535, 585, 585, -5), 0);
eq('Nulova ryzost',              calculateItemPrice(1535, 585, 0, 10), 0);
eq('Zaokrouhleni',               roundPrice(18619.55), 18620);
console.log(fail === 0 ? '\nVSECHNY TESTY PROSLY' : '\nNEPROSLO: ' + fail);
