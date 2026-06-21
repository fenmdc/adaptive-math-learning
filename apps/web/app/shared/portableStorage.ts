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
  SESSION_COMPLETIONS_KEY,
  SESSION_PREFERENCES_KEY,
  STUDENT_MODEL_KEY,
  SUBJECTIVE_REVIEW_QUEUE_KEY
} from "./storage";

const PORTABLE_SCHEMA_VERSION = 4;
const PORTABLE_APP_ID = "adaptive-math-learning";
const PORTABLE_EXPORT_KIND = "local-first-json";
const PORTABLE_KEYS = [
  PRACTICE_LOGS_KEY,
  DIAGNOSTIC_LOGS_KEY,
  LEARNING_PLAN_KEY,
  STUDENT_MODEL_KEY,
  ASSESSMENT_REPORT_KEY,
  SUBJECTIVE_REVIEW_QUEUE_KEY,
  SESSION_PREFERENCES_KEY,
  SESSION_COMPLETIONS_KEY
];
const SUPPORTED_SCHEMA_VERSIONS = new Set([1, 2, 3, 4]);

type PortableProfileSummary = {
  accountId: string;
  accountName: string;
  assessmentReports: number;
  diagnosticAttempts: number;
  learningPlans: number;
  practiceAttempts: number;
  sessionCompletions: number;
  sessionPreferences: number;
  studentModels: number;
  subjectivePending: number;
  subjectiveReviewed: number;
};

type PortableProfileData = {
  accountId: string;
  entries: Record<string, string | null>;
  summary: PortableProfileSummary;
};

export type LearningDataBackup = {
  activeAccountId: string | null;
  app: typeof PORTABLE_APP_ID;
  exportedAt: string;
  exportKind?: typeof PORTABLE_EXPORT_KIND;
  deviceLabel?: string;
  schemaVersion: number;
  accounts: LocalStudentAccount[];
  profiles: PortableProfileData[];
  summary: PortableDataSummary;
};

export type PortableDataSummary = {
  accountCount: number;
  assessmentReportCount: number;
  diagnosticAttempts: number;
  learningPlanCount: number;
  practiceAttempts: number;
  sessionCompletionCount: number;
  profileCount: number;
  sessionPreferenceCount: number;
  studentModelCount: number;
  subjectivePending: number;
  subjectiveReviewed: number;
};

export type RestoreMode = "merge" | "replace";

export type LearningDataBackupPreview = {
  activeAccountName: string;
  exportedAt: string;
  deviceLabel: string;
  schemaVersion: number;
  summary: PortableDataSummary;
  profileSummaries: PortableProfileSummary[];
  warnings: string[];
};

export function createLearningDataBackup(): LearningDataBackup {
  const accounts = readAccounts();
  const accountIds = [GUEST_ACCOUNT_ID, ...accounts.map((account) => account.id)];
  const profiles = accountIds.map((accountId) => {
    const entries = readPortableEntries(accountId);
    return {
      accountId,
      entries,
      summary: summarizePortableProfile(accountId, entries, accounts)
    };
  });
  const backup: LearningDataBackup = {
    activeAccountId: getStoredActiveAccountId(),
    app: PORTABLE_APP_ID,
    deviceLabel: getDeviceLabel(),
    exportedAt: new Date().toISOString(),
    exportKind: PORTABLE_EXPORT_KIND,
    schemaVersion: PORTABLE_SCHEMA_VERSION,
    accounts,
    profiles,
    summary: emptyPortableSummary(accounts.length)
  };

  backup.summary = summarizeLearningDataBackup(backup);

  return backup;
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

  return restoreLearningDataBackupWithMode(raw, { mode: "replace" });
}

export function previewLearningDataBackup(raw: string): LearningDataBackupPreview {
  const parsed = JSON.parse(raw) as unknown;
  const backup = normalizeLearningDataBackup(parsed);
  const activeAccountName = backup.activeAccountId === GUEST_ACCOUNT_ID
    ? "Guest profile"
    : backup.accounts.find((account) => account.id === backup.activeAccountId)?.name ?? "Guest profile";

  return {
    activeAccountName,
    exportedAt: backup.exportedAt,
    deviceLabel: backup.deviceLabel ?? "Unknown device",
    schemaVersion: backup.schemaVersion,
    summary: backup.summary,
    profileSummaries: backup.profiles.map((profile) => profile.summary),
    warnings: buildBackupWarnings(backup)
  };
}

export function restoreLearningDataBackupWithMode(raw: string, options: { mode: RestoreMode }) {
  if (typeof window === "undefined") return null;

  const parsed = JSON.parse(raw) as unknown;
  const backup = normalizeLearningDataBackup(parsed);

  if (options.mode === "merge") {
    restoreLearningDataBackupMerge(backup);
  } else {
    restoreLearningDataBackupReplace(backup);
  }

  window.dispatchEvent(new Event("adaptive-math-learning-account-change"));

  return summarizeCurrentLearningData();
}

function restoreLearningDataBackupReplace(backup: LearningDataBackup) {
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
}

function restoreLearningDataBackupMerge(backup: LearningDataBackup) {
  const currentAccounts = readAccounts();
  const mergedAccounts = mergeAccounts(currentAccounts, backup.accounts);

  window.localStorage.setItem(ACCOUNT_LIST_KEY, JSON.stringify(mergedAccounts));
  if (backup.activeAccountId) {
    window.localStorage.setItem(ACTIVE_ACCOUNT_KEY, backup.activeAccountId);
  }

  backup.profiles.forEach((profile) => {
    PORTABLE_KEYS.forEach((key) => {
      const incoming = profile.entries[key];
      if (typeof incoming !== "string") return;

      const scopedKey = portableStorageKey(key, profile.accountId);
      const existing = window.localStorage.getItem(scopedKey);
      window.localStorage.setItem(scopedKey, mergePortableEntry(key, existing, incoming));
    });
  });
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
      summary.sessionCompletionCount += readAttemptCount(profile.entries[SESSION_COMPLETIONS_KEY]);
      summary.diagnosticAttempts += readAttemptCount(profile.entries[DIAGNOSTIC_LOGS_KEY]);
      summary.learningPlanCount += hasJsonObject(profile.entries[LEARNING_PLAN_KEY]) ? 1 : 0;
      summary.studentModelCount += hasJsonObject(profile.entries[STUDENT_MODEL_KEY]) ? 1 : 0;
      summary.assessmentReportCount += hasJsonObject(profile.entries[ASSESSMENT_REPORT_KEY]) ? 1 : 0;
      summary.sessionPreferenceCount += hasJsonObject(profile.entries[SESSION_PREFERENCES_KEY]) ? 1 : 0;
      summary.subjectivePending += readSubjectiveReviewCount(profile.entries[SUBJECTIVE_REVIEW_QUEUE_KEY], "pending");
      summary.subjectiveReviewed += readSubjectiveReviewCount(profile.entries[SUBJECTIVE_REVIEW_QUEUE_KEY], "reviewed");
      return summary;
    },
    emptyPortableSummary(backup.accounts.length)
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
  if (candidate.app !== PORTABLE_APP_ID || !SUPPORTED_SCHEMA_VERSIONS.has(Number(candidate.schemaVersion))) {
    throw new Error("Backup file version is not supported by this app.");
  }

  if (!Array.isArray(candidate.accounts) || !Array.isArray(candidate.profiles)) {
    throw new Error("Backup file is missing account or profile data.");
  }

  const accounts = candidate.accounts.filter(isPortableAccount);
  const profiles = candidate.profiles
    .filter(isPortableProfile)
    .map((profile) => {
      const entries = PORTABLE_KEYS.reduce<Record<string, string | null>>((nextEntries, key) => {
        nextEntries[key] = typeof profile.entries[key] === "string" ? profile.entries[key] : null;
        return nextEntries;
      }, {});

      return {
        accountId: profile.accountId,
        entries,
        summary: summarizePortableProfile(profile.accountId, entries, accounts)
      };
    });
  const backup: LearningDataBackup = {
    activeAccountId: typeof candidate.activeAccountId === "string" ? candidate.activeAccountId : null,
    app: PORTABLE_APP_ID,
    deviceLabel: typeof candidate.deviceLabel === "string" ? candidate.deviceLabel : "Unknown device",
    exportedAt: typeof candidate.exportedAt === "string" ? candidate.exportedAt : new Date().toISOString(),
    exportKind: PORTABLE_EXPORT_KIND,
    schemaVersion: Number(candidate.schemaVersion),
    accounts,
    profiles,
    summary: emptyPortableSummary(accounts.length)
  };

  backup.summary = summarizeLearningDataBackup(backup);

  return backup;
}

function mergeAccounts(currentAccounts: LocalStudentAccount[], incomingAccounts: LocalStudentAccount[]) {
  const byId = new Map(currentAccounts.map((account) => [account.id, account]));

  incomingAccounts.forEach((incoming) => {
    const current = byId.get(incoming.id);
    if (!current) {
      byId.set(incoming.id, incoming);
      return;
    }

    byId.set(incoming.id, newerAccount(current, incoming));
  });

  return [...byId.values()].sort((left, right) => right.lastUsedAt.localeCompare(left.lastUsedAt));
}

function newerAccount(left: LocalStudentAccount, right: LocalStudentAccount) {
  return right.updatedAt.localeCompare(left.updatedAt) >= 0 ? right : left;
}

function mergePortableEntry(key: string, existing: string | null, incoming: string) {
  if (!existing) return incoming;

  if (key === PRACTICE_LOGS_KEY || key === DIAGNOSTIC_LOGS_KEY || key === SUBJECTIVE_REVIEW_QUEUE_KEY || key === SESSION_COMPLETIONS_KEY) {
    return JSON.stringify(mergeJsonArrays(existing, incoming));
  }

  return incoming;
}

function mergeJsonArrays(existing: string, incoming: string) {
  try {
    const existingItems = JSON.parse(existing) as unknown;
    const incomingItems = JSON.parse(incoming) as unknown;
    if (!Array.isArray(existingItems) || !Array.isArray(incomingItems)) return JSON.parse(incoming) as unknown[];

    const seen = new Set<string>();
    return [...incomingItems, ...existingItems].filter((item, index) => {
      const key = stableItemKey(item, index);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch {
    return [];
  }
}

function stableItemKey(item: unknown, index: number) {
  if (item && typeof item === "object") {
    const candidate = item as { id?: unknown; problem?: unknown; step?: unknown; completedAt?: unknown; createdAt?: unknown; reviewedAt?: unknown };
    if (typeof candidate.id === "string") return candidate.id;
    return [
      typeof candidate.problem === "string" ? candidate.problem : "",
      typeof candidate.step === "number" ? candidate.step : "",
      typeof candidate.completedAt === "string" ? candidate.completedAt : "",
      typeof candidate.createdAt === "string" ? candidate.createdAt : "",
      typeof candidate.reviewedAt === "string" ? candidate.reviewedAt : ""
    ].join("|") || `item-${index}`;
  }

  return `item-${index}`;
}

function buildBackupWarnings(backup: LearningDataBackup) {
  const warnings: string[] = [];

  if (backup.schemaVersion < PORTABLE_SCHEMA_VERSION) {
    warnings.push(`Backup schema v${backup.schemaVersion} will be upgraded to v${PORTABLE_SCHEMA_VERSION} on import.`);
  }

  if (backup.summary.profileCount === 0) {
    warnings.push("Backup does not contain any profile learning data.");
  }

  if (backup.summary.practiceAttempts === 0 && backup.summary.diagnosticAttempts === 0) {
    warnings.push("Backup has no diagnostic or practice attempts.");
  }

  return warnings;
}

function getDeviceLabel() {
  if (typeof window === "undefined") return "Unknown device";
  return window.navigator?.platform || "Browser device";
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

function summarizePortableProfile(
  accountId: string,
  entries: Record<string, string | null>,
  accounts: LocalStudentAccount[]
): PortableProfileSummary {
  return {
    accountId,
    accountName: accountId === GUEST_ACCOUNT_ID
      ? "Guest profile"
      : accounts.find((account) => account.id === accountId)?.name ?? accountId,
    assessmentReports: hasJsonObject(entries[ASSESSMENT_REPORT_KEY]) ? 1 : 0,
    diagnosticAttempts: readAttemptCount(entries[DIAGNOSTIC_LOGS_KEY]),
    learningPlans: hasJsonObject(entries[LEARNING_PLAN_KEY]) ? 1 : 0,
    practiceAttempts: readAttemptCount(entries[PRACTICE_LOGS_KEY]),
    sessionCompletions: readAttemptCount(entries[SESSION_COMPLETIONS_KEY]),
    sessionPreferences: hasJsonObject(entries[SESSION_PREFERENCES_KEY]) ? 1 : 0,
    studentModels: hasJsonObject(entries[STUDENT_MODEL_KEY]) ? 1 : 0,
    subjectivePending: readSubjectiveReviewCount(entries[SUBJECTIVE_REVIEW_QUEUE_KEY], "pending"),
    subjectiveReviewed: readSubjectiveReviewCount(entries[SUBJECTIVE_REVIEW_QUEUE_KEY], "reviewed")
  };
}

function emptyPortableSummary(accountCount: number): PortableDataSummary {
  return {
    accountCount,
    assessmentReportCount: 0,
    diagnosticAttempts: 0,
    learningPlanCount: 0,
    practiceAttempts: 0,
    sessionCompletionCount: 0,
    profileCount: 0,
    sessionPreferenceCount: 0,
    studentModelCount: 0,
    subjectivePending: 0,
    subjectiveReviewed: 0
  };
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

function readSubjectiveReviewCount(raw: string | null | undefined, status: "pending" | "reviewed") {
  if (!raw) return 0;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return 0;

    return parsed.filter((item) => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as { status?: unknown };
      return status === "reviewed" ? candidate.status === "reviewed" : candidate.status !== "reviewed";
    }).length;
  } catch {
    return 0;
  }
}

function hasJsonObject(raw: string | null | undefined) {
  if (!raw) return false;

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Boolean(parsed) && typeof parsed === "object";
  } catch {
    return false;
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
