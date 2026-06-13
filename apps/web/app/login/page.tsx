"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  createAccount,
  deleteAccount,
  readAccounts,
  readActiveAccount,
  setActiveAccount,
  updateAccount,
  type LocalStudentAccount
} from "../shared/accounts";

type AccountFormState = {
  accent: string;
  goal: string;
  level: LocalStudentAccount["level"];
  name: string;
  role: LocalStudentAccount["role"];
};

const defaultForm: AccountFormState = {
  accent: "blue",
  goal: "Build a stable Pre-Algebra to AMC8 path.",
  level: "Pre-Algebra",
  name: "",
  role: "student"
};

const levelOptions: LocalStudentAccount["level"][] = ["Pre-Algebra", "Algebra 1 Readiness", "AMC8"];
const roleOptions: LocalStudentAccount["role"][] = ["student", "parent", "teacher"];
const accentOptions = ["blue", "teal", "gold", "coral"];

export default function LoginPage() {
  const [accounts, setAccounts] = useState<LocalStudentAccount[]>([]);
  const [activeAccount, setActiveAccountState] = useState<LocalStudentAccount | null>(null);
  const [form, setForm] = useState<AccountFormState>(defaultForm);
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState<AccountFormState>(defaultForm);
  const [pendingDeleteId, setPendingDeleteId] = useState("");

  useEffect(() => {
    refreshAccounts();
  }, []);

  function refreshAccounts() {
    setAccounts(readAccounts());
    setActiveAccountState(readActiveAccount());
  }

  function handleCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createAccount(form);
    setForm(defaultForm);
    refreshAccounts();
    window.location.href = "/";
  }

  function handleSelectAccount(accountId: string) {
    setActiveAccount(accountId);
    window.location.href = "/";
  }

  function startEditing(account: LocalStudentAccount) {
    setEditingId(account.id);
    setEditForm({
      accent: account.accent,
      goal: account.goal,
      level: account.level,
      name: account.name,
      role: account.role
    });
  }

  function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;

    updateAccount(editingId, editForm);
    setEditingId("");
    refreshAccounts();
  }

  function handleDelete(accountId: string) {
    deleteAccount(accountId);
    if (editingId === accountId) setEditingId("");
    if (pendingDeleteId === accountId) setPendingDeleteId("");
    refreshAccounts();
  }

  return (
    <main className="app-shell login-shell">
      <div className="login-container account-dashboard-container">
        <section className="panel login-panel">
          <div className="account-page-head">
            <div>
              <p className="eyebrow">Local Account v0.2</p>
              <h1 className="login-title">Student profiles</h1>
              <p className="page-subtitle">
                Keep each learner&apos;s diagnostic report, student model, review queue, and learning path separate on this device.
              </p>
            </div>
            <div className="active-profile-card">
              <span>Active profile</span>
              <strong>{activeAccount?.name ?? "Guest profile"}</strong>
              <p>{activeAccount?.goal ?? "Create or select a profile before a serious session."}</p>
            </div>
          </div>

          <div className="account-dashboard-grid">
            <form className="account-create-card" onSubmit={handleCreateAccount}>
              <div>
                <p className="eyebrow">Create Profile</p>
                <h2 className="panel-title">New learner</h2>
              </div>
              <label className="field-label" htmlFor="student-name">
                Student name
                <input
                  className="answer-input"
                  id="student-name"
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Student name"
                  value={form.name}
                />
              </label>
              <div className="account-form-grid">
                <AccountSelect
                  id="student-level"
                  label="Current focus"
                  onChange={(value) => setForm({ ...form, level: value as LocalStudentAccount["level"] })}
                  options={levelOptions}
                  value={form.level}
                />
                <AccountSelect
                  id="student-role"
                  label="Use as"
                  onChange={(value) => setForm({ ...form, role: value as LocalStudentAccount["role"] })}
                  options={roleOptions}
                  value={form.role}
                />
              </div>
              <label className="field-label" htmlFor="student-goal">
                Learning goal
                <textarea
                  className="text-area-input"
                  id="student-goal"
                  onChange={(event) => setForm({ ...form, goal: event.target.value })}
                  placeholder="Example: Prepare for AMC8 while repairing fraction fluency."
                  value={form.goal}
                />
              </label>
              <AccentPicker value={form.accent} onChange={(accent) => setForm({ ...form, accent })} />
              <button className="button" type="submit">
                Create and continue
              </button>
            </form>

            <div className="account-list account-list-upgraded">
              <div className="account-list-head">
                <span>Existing profiles</span>
                <strong>{accounts.length}</strong>
              </div>
              {accounts.length === 0 ? (
                <p className="muted">No local student profiles yet.</p>
              ) : (
                accounts.map((account) => (
                  <article
                    className={`account-profile-card account-accent-${account.accent} ${activeAccount?.id === account.id ? "account-profile-active" : ""}`}
                    key={account.id}
                  >
                    {editingId === account.id ? (
                      <form className="account-edit-form" onSubmit={handleSaveEdit}>
                        <label className="field-label" htmlFor={`edit-name-${account.id}`}>
                          Name
                          <input
                            className="answer-input"
                            id={`edit-name-${account.id}`}
                            onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                            value={editForm.name}
                          />
                        </label>
                        <div className="account-form-grid">
                          <AccountSelect
                            id={`edit-level-${account.id}`}
                            label="Current focus"
                            onChange={(value) => setEditForm({ ...editForm, level: value as LocalStudentAccount["level"] })}
                            options={levelOptions}
                            value={editForm.level}
                          />
                          <AccountSelect
                            id={`edit-role-${account.id}`}
                            label="Use as"
                            onChange={(value) => setEditForm({ ...editForm, role: value as LocalStudentAccount["role"] })}
                            options={roleOptions}
                            value={editForm.role}
                          />
                        </div>
                        <label className="field-label" htmlFor={`edit-goal-${account.id}`}>
                          Learning goal
                          <textarea
                            className="text-area-input"
                            id={`edit-goal-${account.id}`}
                            onChange={(event) => setEditForm({ ...editForm, goal: event.target.value })}
                            value={editForm.goal}
                          />
                        </label>
                        <AccentPicker value={editForm.accent} onChange={(accent) => setEditForm({ ...editForm, accent })} />
                        <div className="login-actions">
                          <button className="button" type="submit">
                            Save profile
                          </button>
                          <button className="button-secondary" onClick={() => setEditingId("")} type="button">
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="account-card-head">
                          <div>
                            <span>{formatRole(account.role)}</span>
                            <h2>{account.name}</h2>
                          </div>
                          {activeAccount?.id === account.id && <strong className="active-pill">Active</strong>}
                        </div>
                        <p>{account.goal}</p>
                        <div className="account-card-meta">
                          <span>{account.level}</span>
                          <span>Last used {formatDate(account.lastUsedAt)}</span>
                          <span>Updated {formatDate(account.updatedAt)}</span>
                        </div>
                        <div className="login-actions">
                          <button className="button" onClick={() => handleSelectAccount(account.id)} type="button">
                            Continue
                          </button>
                          <button className="button-secondary" onClick={() => startEditing(account)} type="button">
                            Edit
                          </button>
                          {pendingDeleteId === account.id ? (
                            <>
                              <button className="button-secondary account-danger-button" onClick={() => handleDelete(account.id)} type="button">
                                Confirm delete
                              </button>
                              <button className="button-secondary" onClick={() => setPendingDeleteId("")} type="button">
                                Keep
                              </button>
                            </>
                          ) : (
                            <button className="button-secondary" onClick={() => setPendingDeleteId(account.id)} type="button">
                              Delete
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="login-actions account-bottom-actions">
            <Link className="button-secondary" href="/">
              Continue as guest
            </Link>
            <Link className="button-secondary" href="/dashboard">
              Open dashboard
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function AccountSelect({
  id,
  label,
  onChange,
  options,
  value
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="field-label" htmlFor={id}>
      {label}
      <select className="select-input" id={id} onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => (
          <option key={option} value={option}>
            {formatRole(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function AccentPicker({ onChange, value }: { onChange: (value: string) => void; value: string }) {
  return (
    <fieldset className="accent-picker">
      <legend>Profile color</legend>
      <div>
        {accentOptions.map((accent) => (
          <button
            aria-label={`Use ${accent} profile color`}
            className={`accent-swatch account-accent-${accent} ${value === accent ? "accent-swatch-active" : ""}`}
            key={accent}
            onClick={() => onChange(accent)}
            type="button"
          />
        ))}
      </div>
    </fieldset>
  );
}

function formatRole(value: string) {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}
