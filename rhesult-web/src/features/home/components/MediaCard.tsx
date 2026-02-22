import { HeroCard, ModuleItem } from "../types";

type MediaCardProps = {
  card: HeroCard | ModuleItem;
  variant: "hero" | "module";
  className?: string;
};

function hasHeroFields(card: HeroCard | ModuleItem): card is HeroCard {
  return "subtitle" in card;
}

export function MediaCard({ card, variant, className = "" }: MediaCardProps) {
  const subtitle = hasHeroFields(card) ? card.subtitle : card.description;
  const heroGradient = hasHeroFields(card) ? card.gradient : "from-slate-950";

  if (variant === "hero") {
    return (
      <div className={`relative overflow-hidden rounded-2xl ${className}`}>
        <span className="absolute top-3 left-4 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-sm z-10">
          {card.label}
        </span>
        <img
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity duration-300"
          src={card.image}
          alt={card.label}
        />
        <div className={`absolute inset-0 bg-linear-to-t ${heroGradient} via-transparent to-transparent`} />

        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3">
          <div>
            {hasHeroFields(card) && (
              <p className="text-white font-bold text-sm md:text-base">{card.title}</p>
            )}
            <p className="text-white/75 text-xs mt-1">{subtitle}</p>
          </div>
          <button className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-white/90 hover:bg-white transition-all grid place-items-center font-bold text-slate-900">
            ↗
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl h-[200px] bg-slate-100 group cursor-pointer hover:shadow-lg transition-all ${className}`}>
      <span className="absolute top-3 left-4 px-3 py-1 rounded-full text-xs font-bold bg-white/90 text-slate-900 z-10">
        {card.label}
      </span>
      <img
        loading="lazy"
        className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-300"
        src={card.image}
        alt={card.label}
      />
      <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-transparent to-transparent"></div>
      <div className="absolute bottom-4 left-4 right-4">
        <p className="text-white font-bold text-sm">Gestão de {card.label.toLowerCase()}</p>
        <p className="text-white/70 text-xs mt-1">{subtitle}</p>
      </div>
    </div>
  );
}
