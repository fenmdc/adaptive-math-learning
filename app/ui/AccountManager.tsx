"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  ACCOUNT_CHANGE_EVENT,
  GUEST_ACCOUNT_ID,
  createAccount,
  getActiveAccountId,
  readAccounts,
  setActiveAccount,
  signOutAccount,
  type LocalStudentAccount,
} from "@/packages/accounts";
import { readLegacyLearningSummary } from "@/packages/accounts/legacy-history";

export default function AccountManager() {
  const [accounts, setAccounts] = useState<LocalStudentAccount[]>([]);
  const [activeId, setActiveId] = useState(GUEST_ACCOUNT_ID);
  const [name, setName] = useState("");
  const [level, setLevel] = useState<LocalStudentAccount["level"]>("Pre-Algebra");

  function refresh() {
    setAccounts(readAccounts(window.localStorage));
    setActiveId(getActiveAccountId(window.localStorage));
  }

  useEffect(refresh, []);

  function activate(accountId: string) {
    if (accountId === GUEST_ACCOUNT_ID) signOutAccount(window.localStorage);
    else setActiveAccount(window.localStorage, accountId);
    window.dispatchEvent(new Event(ACCOUNT_CHANGE_EVENT));
    refresh();
  }

  function addAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createAccount(window.localStorage, { name, level });
    setName("");
    window.dispatchEvent(new Event(ACCOUNT_CHANGE_EVENT));
    refresh();
  }

  return (
    <div className="accounts-page">
      <header className="page-header accounts-header">
        <div>
          <p className="page-context">Learner profiles</p>
          <h1>Your existing accounts now work here.</h1>
          <p className="page-intro">Profiles and their previous learning records stay on this browser. New practice progress is isolated for each learner.</p>
        </div>
      </header>

      <section className="account-grid" aria-label="Available learner profiles">
        <article className={activeId === GUEST_ACCOUNT_ID ? "account-card is-active" : "account-card"}>
          <span>Guest</span><h2>Guest learner</h2><p>Uses the unscoped local practice session.</p>
          <button disabled={activeId === GUEST_ACCOUNT_ID} onClick={() => activate(GUEST_ACCOUNT_ID)} type="button">{activeId === GUEST_ACCOUNT_ID ? "Active profile" : "Use this profile"}</button>
        </article>
        {accounts.map((account) => {
          const history = readLegacyLearningSummary(window.localStorage, account.id);
          return (
            <article className={activeId === account.id ? "account-card is-active" : "account-card"} key={account.id}>
              <span>{account.role}</span><h2>{account.name}</h2><p>{account.level} · {account.goal}</p>
              <dl>
                <div><dt>Previous practice</dt><dd>{history.practiceAttempts}</dd></div>
                <div><dt>Diagnostics</dt><dd>{history.diagnosticAttempts}</dd></div>
              </dl>
              <button disabled={activeId === account.id} onClick={() => activate(account.id)} type="button">{activeId === account.id ? "Active profile" : "Use this profile"}</button>
            </article>
          );
        })}
      </section>

      <form className="create-account" onSubmit={addAccount}>
        <div><span>New learner</span><h2>Create a separate profile</h2></div>
        <label><span>Name</span><input onChange={(event) => setName(event.target.value)} required value={name} /></label>
        <label><span>Learning level</span><select onChange={(event) => setLevel(event.target.value as LocalStudentAccount["level"])} value={level}><option>Pre-Algebra</option><option>Algebra 1 Readiness</option><option>AMC8</option></select></label>
        <button className="primary-button" type="submit">Create profile</button>
      </form>
    </div>
  );
}
