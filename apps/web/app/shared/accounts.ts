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

export const ACCOUNT_LIST_KEY = "adaptive-math-learning.accounts";
export const ACTIVE_ACCOUNT_KEY = "adaptive-math-learning.activeAccountId";
export const GUEST_ACCOUNT_ID = "guest";

export function readAccounts(): LocalStudentAccount[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(ACCOUNT_LIST_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<LocalStudentAccount>[]) : [];
    if (!Array.isArray(parsed)) return [];
    const accounts = parsed.map(normalizeAccount).filter(Boolean) as LocalStudentAccount[];
    const needsMigration = parsed.some((account) =>
      !account.role || !account.level || !account.goal || !account.accent || !account.updatedAt
    );

    if (accounts.length !== parsed.length || needsMigration) {
      writeAccounts(accounts);
    }

    return accounts;
  } catch {
    return [];
  }
}

export function readActiveAccount() {
  if (typeof window === "undefined") return null;

  const activeId = window.localStorage.getItem(ACTIVE_ACCOUNT_KEY);
  if (!activeId) return null;

  return readAccounts().find((account) => account.id === activeId) ?? null;
}

export function getActiveAccountId() {
  if (typeof window === "undefined") return GUEST_ACCOUNT_ID;

  return window.localStorage.getItem(ACTIVE_ACCOUNT_KEY) || GUEST_ACCOUNT_ID;
}

export function createAccount(input: string | {
  accent?: string;
  goal?: string;
  level?: LocalStudentAccount["level"];
  name: string;
  role?: LocalStudentAccount["role"];
}) {
  const trimmed = typeof input === "string" ? input.trim() : input.name.trim();
  const now = new Date().toISOString();
  const account: LocalStudentAccount = {
    id: `student-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: trimmed || "Student",
    role: typeof input === "string" ? "student" : input.role ?? "student",
    level: typeof input === "string" ? "Pre-Algebra" : input.level ?? "Pre-Algebra",
    goal: typeof input === "string" ? "Build a stable adaptive math path." : input.goal?.trim() || "Build a stable adaptive math path.",
    accent: typeof input === "string" ? "blue" : input.accent ?? "blue",
    createdAt: now,
    lastUsedAt: now,
    updatedAt: now
  };
  const accounts = readAccounts();

  writeAccounts([account, ...accounts]);
  setActiveAccount(account.id);

  return account;
}

export function updateAccount(accountId: string, updates: Partial<Pick<LocalStudentAccount, "accent" | "goal" | "level" | "name" | "role">>) {
  if (typeof window === "undefined") return null;

  const accounts = readAccounts();
  const now = new Date().toISOString();
  let updated: LocalStudentAccount | null = null;
  const nextAccounts = accounts.map((account) => {
    if (account.id !== accountId) return account;

    updated = normalizeAccount({
      ...account,
      ...updates,
      name: updates.name?.trim() || account.name,
      goal: updates.goal?.trim() || account.goal,
      updatedAt: now
    });

    return updated;
  });

  writeAccounts(nextAccounts);
  window.dispatchEvent(new Event("adaptive-math-learning-account-change"));

  return updated;
}

export function deleteAccount(accountId: string) {
  if (typeof window === "undefined") return;

  const accounts = readAccounts();
  writeAccounts(accounts.filter((account) => account.id !== accountId));

  if (window.localStorage.getItem(ACTIVE_ACCOUNT_KEY) === accountId) {
    window.localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
  }

  window.dispatchEvent(new Event("adaptive-math-learning-account-change"));
}

export function setActiveAccount(accountId: string) {
  if (typeof window === "undefined") return null;

  const accounts = readAccounts();
  const now = new Date().toISOString();
  const nextAccounts = accounts.map((account) =>
    account.id === accountId ? { ...account, lastUsedAt: now } : account
  );
  const active = nextAccounts.find((account) => account.id === accountId) ?? null;

  if (!active) return null;

  writeAccounts(nextAccounts);
  window.localStorage.setItem(ACTIVE_ACCOUNT_KEY, accountId);
  window.dispatchEvent(new Event("adaptive-math-learning-account-change"));

  return active;
}

export function signOutAccount() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
  window.dispatchEvent(new Event("adaptive-math-learning-account-change"));
}

export function accountScopedKey(key: string, accountId = getActiveAccountId()) {
  return accountId === GUEST_ACCOUNT_ID
    ? key
    : `adaptive-math-learning.account.${accountId}.${key}`;
}

function writeAccounts(accounts: LocalStudentAccount[]) {
  window.localStorage.setItem(ACCOUNT_LIST_KEY, JSON.stringify(accounts));
}

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
    updatedAt: account.updatedAt || account.createdAt || now
  };
}
