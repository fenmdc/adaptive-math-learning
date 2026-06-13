import {
  ACCOUNT_LIST_KEY,
  ACTIVE_ACCOUNT_KEY,
  GUEST_ACCOUNT_ID,
  accountScopedKey,
  getActiveAccountId,
  readAccounts,
  type LocalStudentAccount
} from "./accounts";
import {
  ASSESSMENT_REPORT_KEY,
  DIAGNOSTIC_LOGS_KEY,
  LEARNING_PLAN_KEY,
  PRACTICE_LOGS_KEY,
  STUDENT_MODEL_KEY
} from "./storage";

const PORTABLE_SCHEMA_VERSION = 1;
const PORTABLE_APP_ID = "adaptive-math-learning";
const PORTABLE_KEYS = [
  PRACTICE_LOGS_KEY,
  DIAGNOSTIC_LOGS_KEY,
  LEARNING_PLAN_KEY,
  STUDENT_MODEL_KEY,
  ASSESSMENT_REPORT_KEY
];

type PortableProfileData = {
  accountId: string;
  entries: Record<string, string | null>;
};

export type LearningDataBackup = {
  activeAccountId: string | null;
  app: typeof PORTABLE_APP_ID;
  exportedAt: string;
  schemaVersion: typeof PORTABLE_SCHEMA_VERSION;
  accounts: LocalStudentAccount[];
  profiles: PortableProfileData[];
};

export type PortableDataSummary = {
  accountCount: number;
  diagnosticAttempts: number;
  practiceAttempts: number;
  profileCount: number;
};

export function createLearningDataBackup(): LearningDataBackup {
  const accounts = readAccounts();
  const accountIds = [GUEST_ACCOUNT_ID, ...accounts.map((account) => account.id)];

  return {
    activeAccountId: getStoredActiveAccountId(),
    app: PORTABLE_APP_ID,
    exportedAt: new Date().toISOString(),
    schemaVersion: PORTABLE_SCHEMA_VERSION,
    accounts,
    profiles: accountIds.map((accountId) => ({
      accountId,
      entries: readPortableEntries(accountId)
    }))
  };
}

export function downloadLearningDataBackup() {
  if (typeof window === "undefined") return null;

  const backup = createLearningDataBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json"
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = backup.exportedAt.slice(0, 10);

  link.href = url;
  link.download = `adaptive-math-learning-backup-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  return summarizeLearningDataBackup(backup);
}

export function restoreLearningDataBackup(raw: string) {
  if (typeof window === "undefined") return null;

  const parsed = JSON.parse(raw) as unknown;
  const backup = normalizeLearningDataBackup(parsed);

  clearAllPortableLearningData();
  window.localStorage.setItem(ACCOUNT_LIST_KEY, JSON.stringify(backup.accounts));
  if (backup.activeAccountId) {
    window.localStorage.setItem(ACTIVE_ACCOUNT_KEY, backup.activeAccountId);
  } else {
    window.localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
  }

  backup.profiles.forEach((profile) => {
    PORTABLE_KEYS.forEach((key) => {
      const value = profile.entries[key];
      const scopedKey = portableStorageKey(key, profile.accountId);

      if (typeof value === "string") {
        window.localStorage.setItem(scopedKey, value);
      }
    });
  });

  window.dispatchEvent(new Event("adaptive-math-learning-account-change"));

  return summarizeLearningDataBackup(backup);
}

export function clearActiveLearningData() {
  if (typeof window === "undefined") return;

  const accountId = getActiveAccountId();
  PORTABLE_KEYS.forEach((key) => {
    window.localStorage.removeItem(portableStorageKey(key, accountId));
  });
  window.dispatchEvent(new Event("adaptive-math-learning-account-change"));
}

export function summarizeCurrentLearningData() {
  return summarizeLearningDataBackup(createLearningDataBackup());
}

export function summarizeLearningDataBackup(backup: LearningDataBackup): PortableDataSummary {
  return backup.profiles.reduce(
    (summary, profile) => {
      summary.profileCount += hasAnyProfileData(profile) ? 1 : 0;
      summary.practiceAttempts += readAttemptCount(profile.entries[PRACTICE_LOGS_KEY]);
      summary.diagnosticAttempts += readAttemptCount(profile.entries[DIAGNOSTIC_LOGS_KEY]);
      return summary;
    },
    {
      accountCount: backup.accounts.length,
      diagnosticAttempts: 0,
      practiceAttempts: 0,
      profileCount: 0
    }
  );
}

function clearAllPortableLearningData() {
  const accounts = readAccounts();
  const accountIds = [GUEST_ACCOUNT_ID, ...accounts.map((account) => account.id)];

  accountIds.forEach((accountId) => {
    PORTABLE_KEYS.forEach((key) => {
      window.localStorage.removeItem(portableStorageKey(key, accountId));
    });
  });
  window.localStorage.removeItem(ACCOUNT_LIST_KEY);
  window.localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
  clearOrphanedAccountScopedData();
}

function readPortableEntries(accountId: string) {
  return PORTABLE_KEYS.reduce<Record<string, string | null>>((entries, key) => {
    entries[key] = window.localStorage.getItem(portableStorageKey(key, accountId));
    return entries;
  }, {});
}

function portableStorageKey(key: string, accountId: string) {
  return accountId === GUEST_ACCOUNT_ID ? key : accountScopedKey(key, accountId);
}

function getStoredActiveAccountId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_ACCOUNT_KEY);
}

function normalizeLearningDataBackup(value: unknown): LearningDataBackup {
  if (!value || typeof value !== "object") {
    throw new Error("Backup file is not a valid Adaptive Math Learning export.");
  }

  const candidate = value as Partial<LearningDataBackup>;
  if (candidate.app !== PORTABLE_APP_ID || candidate.schemaVersion !== PORTABLE_SCHEMA_VERSION) {
    throw new Error("Backup file version is not supported by this app.");
  }

  if (!Array.isArray(candidate.accounts) || !Array.isArray(candidate.profiles)) {
    throw new Error("Backup file is missing account or profile data.");
  }

  return {
    activeAccountId: typeof candidate.activeAccountId === "string" ? candidate.activeAccountId : null,
    app: PORTABLE_APP_ID,
    exportedAt: typeof candidate.exportedAt === "string" ? candidate.exportedAt : new Date().toISOString(),
    schemaVersion: PORTABLE_SCHEMA_VERSION,
    accounts: candidate.accounts.filter(isPortableAccount),
    profiles: candidate.profiles
      .filter(isPortableProfile)
      .map((profile) => ({
        accountId: profile.accountId,
        entries: PORTABLE_KEYS.reduce<Record<string, string | null>>((entries, key) => {
          entries[key] = typeof profile.entries[key] === "string" ? profile.entries[key] : null;
          return entries;
        }, {})
      }))
  };
}

function isPortableAccount(value: unknown): value is LocalStudentAccount {
  if (!value || typeof value !== "object") return false;
  const account = value as Partial<LocalStudentAccount>;
  return typeof account.id === "string" && typeof account.name === "string";
}

function isPortableProfile(value: unknown): value is PortableProfileData {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<PortableProfileData>;
  return typeof profile.accountId === "string" && Boolean(profile.entries) && typeof profile.entries === "object";
}

function hasAnyProfileData(profile: PortableProfileData) {
  return Object.values(profile.entries).some((value) => typeof value === "string" && value.length > 0);
}

function readAttemptCount(raw: string | null | undefined) {
  if (!raw) return 0;

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

function clearOrphanedAccountScopedData() {
  const accountPrefix = "adaptive-math-learning.account.";
  const keysToRemove: string[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(accountPrefix)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
}
