// Miroir client-safe des catégories du moteur (engine/library.mjs importe fs → serveur only).
// Garder synchro avec engine/library.mjs → CATEGORIES.
export const CATEGORIES: { id: string; label: string; emoji: string }[] = [
  { id: "video", label: "Vidéo & Montage", emoji: "🎬" },
  { id: "audio", label: "Audio & Voix", emoji: "🎙" },
  { id: "image", label: "Images & Photo", emoji: "🖼" },
  { id: "design", label: "Design & UI", emoji: "🎨" },
  { id: "web", label: "Sites & Apps (dev)", emoji: "🌐" },
  { id: "social", label: "Contenu & Réseaux sociaux", emoji: "📱" },
  { id: "seo", label: "SEO & Visibilité", emoji: "📈" },
  { id: "marketing", label: "Marketing & Croissance", emoji: "🚀" },
  { id: "vente", label: "Vente & Prospection", emoji: "🎯" },
  { id: "business", label: "Business & Stratégie", emoji: "💼" },
  { id: "admin", label: "Finance & Admin", emoji: "🧾" },
  { id: "legal", label: "Juridique", emoji: "⚖️" },
  { id: "recherche", label: "Recherche & Veille", emoji: "🔍" },
  { id: "docs", label: "Documents & Bureautique", emoji: "📄" },
  { id: "data", label: "Data & Analyse", emoji: "📊" },
  { id: "productivite", label: "Productivité & Orga", emoji: "✅" },
  { id: "meta", label: "Méta & Outillage IA", emoji: "🧠" },
];
