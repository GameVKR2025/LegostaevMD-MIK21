export enum Category {
  Diets = "Диеты",
  Products = "Продукты",
  Recipes = "Рецепты",
  Horoscopes = "Гороскопы",
  Lifestyle = "Лайфстайл",
}

export interface TextVariant {
  id: string;
  text: string;
}

export interface SeoVariant {
  id: string;
  title: string;
  description: string;
}

export interface ImageVariant {
  id: string;
  imageUrl: string; // base64 data URI
}

export type GeneratedVariant = TextVariant | SeoVariant | ImageVariant;