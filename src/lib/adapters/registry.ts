import { env } from "../env";
import { AnybuddyAdapter } from "./anybuddy";
import { CustomAdapter } from "./custom";
import { DoinsportAdapter } from "./doinsport";
import { MockAdapter } from "./mock";
import { PlaytomicAdapter } from "./playtomic";
import type { ProviderAdapter, ProviderName } from "./types";

const liveAdapters: Record<ProviderName, ProviderAdapter> = {
  playtomic: new PlaytomicAdapter(),
  doinsport: new DoinsportAdapter(),
  anybuddy: new AnybuddyAdapter(),
  custom: new CustomAdapter(),
  tenup: new CustomAdapter(),
  mock: new MockAdapter(),
};

const mock = new MockAdapter();
const mockAdapters: Record<ProviderName, ProviderAdapter> = {
  playtomic: mock,
  doinsport: mock,
  anybuddy: mock,
  custom: mock,
  tenup: mock,
  mock: mock,
};

export function getAdapter(provider: ProviderName): ProviderAdapter {
  const table = env.ADAPTERS_MODE === "mock" ? mockAdapters : liveAdapters;
  return table[provider] ?? table.mock;
}

export function allAdapters(): ProviderAdapter[] {
  const table = env.ADAPTERS_MODE === "mock" ? mockAdapters : liveAdapters;
  return Array.from(new Set(Object.values(table)));
}
