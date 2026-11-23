import { and, eq, isNotNull, type AnyColumn, type SQL } from "drizzle-orm";
import type { RowOf } from "@/db/columns";
import { userSettings } from "@/db/schema";

// The email-tracking setup on user_settings, by the names the inbound code uses; createdAt is null until an address was first set up.
export const ADDRESS = {
  createdAt: userSettings.trackingAt,
  confirmCode: userSettings.trackingConfirmCode,
  confirmUrl: userSettings.trackingConfirmUrl,
  confirmSource: userSettings.trackingConfirmSource,
  confirmAt: userSettings.trackingConfirmAt,
  confirmedAt: userSettings.trackingConfirmedAt,
  sources: userSettings.trackingSources,
  testAt: userSettings.trackingTestAt,
  lastEmailAt: userSettings.trackingLastEmailAt,
};

export type AddressRow = RowOf<typeof ADDRESS>;

// The account's setup, only once one exists, as a row of the old inbound_addresses table did.
export function hasAddress(userId: string | AnyColumn): SQL | undefined {
  return and(eq(userSettings.userId, userId), isNotNull(userSettings.trackingAt));
}
