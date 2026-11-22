import type { Column, GetColumnData } from "drizzle-orm";

// The row a select of these columns returns, so a module can name a subset of user_settings by its own keys.
export type RowOf<T extends Record<string, Column>> = { [K in keyof T]: GetColumnData<T[K]> };
