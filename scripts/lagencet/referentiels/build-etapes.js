const P = {
  AUDIT: ["Commande reçue","Visite planifiée","En production","Livré","Facturé"],
  MAR: ["Contrat signé","Visite audit","Projet travaux","Dossier aides","Travaux","Rapport"],
  AMO: ["Pré-analyse","Proposition","Voté AG","Dossier Anah","Travaux","Solde versé"],
  RENO: ["Estimation","Devis signé","Chantier planifié","En cours","Réception","Soldé"],
  ARCHI: ["Brief","Avant-projet","Plans livrés","Suivi travaux","Soldé"],
};
const COLORS = {AUDIT:"blue", MAR:"green", AMO:"purple", RENO:"orange", ARCHI:"turquoise"};
const slug = s => s.normalize("NFD").replace(/[̀-ͯ]/g,"").toUpperCase().replace(/[^A-Z0-9]+/g,"_").replace(/^_|_$/g,"");
let pos = 0; const options = [];
for (const [k, arr] of Object.entries(P))
  for (const label of arr)
    options.push({ value: `${k}_${slug(label)}`, label, position: pos++, color: COLORS[k] });
console.log(JSON.stringify(options));
