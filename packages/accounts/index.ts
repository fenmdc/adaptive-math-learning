export const ACCOUNT_LIST_KEY = "adaptive-math-learning.accounts";
export const ACTIVE_ACCOUNT_KEY = "adaptive-math-learning.activeAccountId";
export const GUEST_ACCOUNT_ID = "guest";
export const ACCOUNT_CHANGE_EVENT = "adaptive-math-learning-account-change";

export type LocalStudentAccount = {
  id: string;
  name: string;
  role: "student" | "parent" | "teacher";
  level: "Pre-Algebra" | "Algebra 1 Readiness" | "AMC8";
  goal: string;
  accent: string;
  createdAt: string;
  lastUsedAt: string;
  updatedAt: string;
};

export type AccountStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function normalizeAccount(account: Partial<LocalStudentAccount> | null | undefined): LocalStudentAccount | null {
  if (!account?.id) return null;
  const now = new Date().toISOString();

  return {
    id: account.id,
    name: account.name?.trim() || "Student",
    role: account.role === "parent" || account.role === "teacher" ? account.role : "student",
    level: account.level === "Algebra 1 Readiness" || account.level === "AMC8" ? account.level : "Pre-Algebra",
    goal: account.goal?.trim() || "Build a stable adaptive math path.",
    accent: account.accent || "blue",
    createdAt: account.createdAt || now,
    lastUsedAt: account.lastUsedAt || account.createdAt || now,
    updatedAt: account.updatedAt || account.createdAt || now,
  };
}

export function readAccounts(storage: AccountStorage): LocalStudentAccount[] {
  try {
    const raw = storage.getItem(ACCOUNT_LIST_KEY);
    const parsed = raw ? JSON.parse(raw) as Partial<LocalStudentAccount>[] : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeAccount).filter((account): account is LocalStudentAccount => Boolean(account));
  } catch {
    return [];
  }
}

export function getActiveAccountId(storage: AccountStorage) {
  try {
    const activeId = storage.getItem(ACTIVE_ACCOUNT_KEY);
    return activeId && readAccounts(storage).some((account) => account.id === activeId)
      ? activeId
      : GUEST_ACCOUNT_ID;
  } catch {
    return GUEST_ACCOUNT_ID;
  }
}

export function readActiveAccount(storage: AccountStorage) {
  const activeId = getActiveAccountId(storage);
  return readAccounts(storage).find((account) => account.id === activeId) ?? null;
}

export function setActiveAccount(storage: AccountStorage, accountId: string, now = new Date().toISOString()) {
  const accounts = readAccounts(storage);
  const active = accounts.find((account) => account.id === accountId);
  if (!active) return null;

  const nextAccounts = accounts.map((account) => account.id === accountId
    ? { ...account, lastUsedAt: now }
    : account);
  storage.setItem(ACCOUNT_LIST_KEY, JSON.stringify(nextAccounts));
  storage.setItem(ACTIVE_ACCOUNT_KEY, accountId);
  return nextAccounts.find((account) => account.id === accountId) ?? null;
}

export function signOutAccount(storage: AccountStorage) {
  storage.removeItem(ACTIVE_ACCOUNT_KEY);
}

export function createAccount(
  storage: AccountStorage,
  input: Pick<LocalStudentAccount, "name"> & Partial<Pick<LocalStudentAccount, "goal" | "level" | "role" | "accent">>,
  now = new Date().toISOString(),
) {
  const account: LocalStudentAccount = {
    id: `student-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name.trim() || "Student",
    role: input.role ?? "student",
    level: input.level ?? "Pre-Algebra",
    goal: input.goal?.trim() || "Build a stable adaptive math path.",
    accent: input.accent ?? "blue",
    createdAt: now,
    lastUsedAt: now,
    updatedAt: now,
  };
  storage.setItem(ACCOUNT_LIST_KEY, JSON.stringify([account, ...readAccounts(storage)]));
  storage.setItem(ACTIVE_ACCOUNT_KEY, account.id);
  return account;
}

export function accountScopedKey(key: string, accountId: string) {
  return accountId === GUEST_ACCOUNT_ID
    ? key
    : `adaptive-math-learning.account.${accountId}.${key}`;
}
