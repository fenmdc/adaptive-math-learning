"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  ACCOUNT_CHANGE_EVENT,
  GUEST_ACCOUNT_ID,
  getActiveAccountId,
  readAccounts,
  setActiveAccount,
  signOutAccount,
  type LocalStudentAccount,
} from "@/packages/accounts";

export default function AccountBar() {
  const [accounts, setAccounts] = useState<LocalStudentAccount[]>([]);
  const [activeId, setActiveId] = useState(GUEST_ACCOUNT_ID);

  useEffect(() => {
    const refresh = () => {
      setAccounts(readAccounts(window.localStorage));
      setActiveId(getActiveAccountId(window.localStorage));
    };
    refresh();
    window.addEventListener(ACCOUNT_CHANGE_EVENT, refresh);
    return () => window.removeEventListener(ACCOUNT_CHANGE_EVENT, refresh);
  }, []);

  function selectAccount(accountId: string) {
    if (accountId === GUEST_ACCOUNT_ID) {
      signOutAccount(window.localStorage);
    } else {
      setActiveAccount(window.localStorage, accountId);
    }
    window.dispatchEvent(new Event(ACCOUNT_CHANGE_EVENT));
    window.location.reload();
  }

  const active = accounts.find((account) => account.id === activeId);

  return (
    <div className="account-bar">
      <label>
        <span>Profile</span>
        <select aria-label="Active learner profile" onChange={(event) => selectAccount(event.target.value)} value={activeId}>
          <option value={GUEST_ACCOUNT_ID}>Guest learner</option>
          {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
        </select>
      </label>
      <div>
        <strong>{active?.name ?? "Guest learner"}</strong>
        <small>{active ? `${active.level} · ${active.role}` : "Local session"}</small>
      </div>
      <Link href="/accounts">Manage</Link>
    </div>
  );
}
