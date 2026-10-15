import { db } from "@/lib/db";

export type ShopConfig = {
  name: string;
  tagline: string;
  bookseller: string;
  city: string;
  contact: string;
};

export const DEFAULT_SHOP: ShopConfig = {
  name: "Subtext",
  tagline: "Independent bookshop. A collection on display.",
  bookseller: "",
  city: "",
  contact: "",
};

const KEYS = Object.keys(DEFAULT_SHOP) as (keyof ShopConfig)[];

export function getShopConfig(): ShopConfig {
  const rows = db().prepare("SELECT key, value FROM shop_settings").all() as { key: string; value: string }[];
  const stored = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const config = { ...DEFAULT_SHOP };
  for (const key of KEYS) {
    const value = stored[`shop_${key}`];
    if (typeof value === "string") config[key] = value;
  }
  return config;
}

export function saveShopConfig(patch: Partial<ShopConfig>): ShopConfig {
  const statement = db().prepare(
    "INSERT INTO shop_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  );
  for (const key of KEYS) {
    const value = patch[key];
    if (typeof value === "string") statement.run(`shop_${key}`, value.trim().slice(0, 200));
  }
  return getShopConfig();
}
