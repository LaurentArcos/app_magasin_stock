// Détection de la "famille" d'un produit à partir du champ Produit (texte libre).
//
// La donnée Airtable est saisie à la main et très variable :
//   "zip 13 metal argent", "ZIP 15 5880", "zips parka 1311", "zip séparble noir 56"
// -> tous ces produits appartiennent à la famille "Zip".
//
// Principe :
//   1) on normalise (minuscules, sans accents, espaces compressés) ;
//   2) on cherche une famille connue (liste ci-dessous, les libellés les plus
//      longs d'abord pour que "bouton pression" gagne sur "bouton") ;
//   3) sinon on retombe sur le premier mot alphabétique, mis au singulier.
// Aucun produit n'est donc jamais perdu, et aucune maintenance n'est requise
// quand un nouveau type de produit apparaît.

// Familles connues : clé = identifiant de famille (canonique, sans accent),
// valeur = libellé français affiché au singulier.
export const KNOWN_FAMILIES: { id: string; label: string; match: string[] }[] = [
  { id: "zip", label: "Zip", match: ["zip", "zips", "fermeture", "fermeture eclair"] },
  { id: "aide tirette", label: "Aide tirette", match: ["aide tirette", "aide-tirette"] },
  { id: "attache bretelle", label: "Attache bretelle", match: ["attache bretelle", "attache-bretelle", "attache"] },
  { id: "bord cote", label: "Bord côte", match: ["bord cote", "bord-cote", "bord"] },
  { id: "bouton pression", label: "Bouton pression", match: ["bouton pression", "boutons pression", "pression"] },
  { id: "bouton denim", label: "Bouton denim", match: ["bouton denim", "boutons denim"] },
  { id: "bouton a coudre", label: "Bouton à coudre", match: ["bouton a coudre", "boutons a coudre"] },
  { id: "bouton", label: "Bouton", match: ["bouton", "boutons"] },
  { id: "cordon", label: "Cordon", match: ["cordon", "cordons"] },
  { id: "elastique galon", label: "Élastique galon", match: ["elastique galon", "elastiques galon"] },
  { id: "elastique", label: "Élastique", match: ["elastique", "elastiques"] },
  { id: "etiquette", label: "Étiquette", match: ["etiquette", "etiquettes"] },
  { id: "hangtag", label: "Hangtag", match: ["hangtag", "hangtags", "hang tag"] },
  { id: "passepoil", label: "Passepoil", match: ["passepoil", "passepoils"] },
  { id: "silicon tag", label: "Silicon tag", match: ["silicon tag", "silicone tag", "silicon"] },
  { id: "stopper", label: "Stopper", match: ["stopper", "stoppers"] },
];

// Traduction arabe par identifiant de famille.
export const FAMILY_AR: Record<string, string> = {
  zip: "سحّاب",
  "aide tirette": "مساعد السحّاب",
  "attache bretelle": "مشبك حمّالة",
  "bord cote": "حافة مضلّعة",
  "bouton pression": "زر كبس",
  "bouton denim": "زر دنيم",
  "bouton a coudre": "زر للخياطة",
  bouton: "زر",
  cordon: "حبل",
  "elastique galon": "شريط مطاط",
  elastique: "مطاط",
  etiquette: "علامة",
  hangtag: "بطاقة معلّقة",
  passepoil: "كسرة",
  "silicon tag": "علامة سيليكون",
  stopper: "ستوبر",
};

/** Minuscules, sans accents, ponctuation -> espace, espaces compressés. */
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Retire un "s"/"x" final (pluriel simple) : "zips" -> "zip". */
function singular(word: string): string {
  if (word.length > 3 && /[sx]$/.test(word)) return word.slice(0, -1);
  return word;
}

// Index des motifs connus, du plus long au plus court (en nombre de mots),
// pour que "bouton pression" soit testé avant "bouton".
const PATTERNS = KNOWN_FAMILIES.flatMap((f) =>
  f.match.map((m) => ({ id: f.id, label: f.label, pattern: normalize(m) }))
).sort((a, b) => b.pattern.split(" ").length - a.pattern.split(" ").length);

export interface ProductFamily {
  id: string;
  label: string;
}

/**
 * Renvoie la famille d'une valeur du champ Produit.
 * Renvoie null si la valeur est vide ou purement numérique.
 */
export function familyOf(raw: string | undefined | null): ProductFamily | null {
  const text = normalize(raw ?? "");
  if (!text) return null;

  const words = text.split(" ").map(singular);

  // 1) Famille connue : le motif doit apparaître comme suite de mots.
  for (const p of PATTERNS) {
    const parts = p.pattern.split(" ").map(singular);
    for (let i = 0; i + parts.length <= words.length; i++) {
      let ok = true;
      for (let j = 0; j < parts.length; j++) {
        if (words[i + j] !== parts[j]) {
          ok = false;
          break;
        }
      }
      if (ok) return { id: p.id, label: p.label };
    }
  }

  // 2) Repli : premier mot alphabétique, au singulier.
  const head = words.find((w) => /[a-z]/.test(w));
  if (!head) return null;
  return { id: head, label: head.charAt(0).toUpperCase() + head.slice(1) };
}

/** Libellé pluriel français d'une famille : "Zip" -> "Zips". */
export function pluralLabel(label: string): string {
  const parts = label.trim().split(/\s+/);
  if (parts.length === 0) return label;
  if (!/[sxz]$/i.test(parts[0])) parts[0] = parts[0] + "s";
  return parts.join(" ");
}

/** Libellé affiché d'une famille selon la langue. */
export function familyLabel(id: string, label: string, lang: string): string {
  if (lang === "ar") return FAMILY_AR[id] ?? label;
  return pluralLabel(label);
}

/**
 * Clé de regroupement d'une valeur texte simple (Fournisseur, Chez qui) :
 * insensible à la casse, aux accents et aux espaces parasites.
 * "PRYM", "prym", " prym " -> "prym"
 */
export function groupKey(value: string | undefined | null): string {
  return normalize(value ?? "");
}

/** Libellé d'affichage : première lettre en majuscule sur la valeur nettoyée. */
export function displayLabel(value: string): string {
  const v = value.trim().replace(/\s+/g, " ");
  if (!v) return v;
  // Tout en majuscules d'origine -> on garde ; sinon on capitalise.
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
}
