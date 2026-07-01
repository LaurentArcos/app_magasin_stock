// Traduction FR -> AR des familles de produits (ensemble fixe et connu).
// N'affecte que l'affichage : la donnée Airtable reste en français.

export const PRODUCT_AR: Record<string, string> = {
  Zip: "سحّاب",
  "Attache bretelle": "مشبك حمّالة",
  "Bord côte": "حافة مضلّعة",
  "Bouton à coudre": "زر للخياطة",
  "Bouton denim": "زر دنيم",
  "Bouton pression": "زر كبس",
  Cordon: "حبل",
  Elastique: "مطاط",
  Élastique: "مطاط",
  "Elastique galon": "شريط مطاط",
  "Élastique galon": "شريط مطاط",
  Etiquette: "علامة",
  Étiquette: "علامة",
  Hangtag: "بطاقة معلّقة",
  Passepoil: "كسرة",
  "Silicon tag": "علامة سيليكون",
  Stopper: "ستوبر",
  "aide tirette": "مساعد السحّاب",
};

// Renvoie le nom traduit selon la langue ; si inconnu, renvoie l'original.
export function translateProduct(name: string, lang: string): string {
  if (lang === "ar") return PRODUCT_AR[name.trim()] ?? name;
  return name;
}
