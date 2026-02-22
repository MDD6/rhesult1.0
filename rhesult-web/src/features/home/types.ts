export interface HeroCard {
  label: string;
  title: string;
  subtitle: string;
  image: string;
  gradient: string;
  size: "large" | "small";
}

export interface FeatureItem {
  icon: string;
  name: string;
  description: string;
}

export interface ModuleItem {
  label: string;
  description: string;
  image: string;
}

export interface ScoreItem {
  label: string;
  value: number;
}
