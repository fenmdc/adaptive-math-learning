"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readActiveAccount, signOutAccount, type LocalStudentAccount } from "./shared/accounts";

export default function AccountBar() {
  const [account, setAccount] = useState<LocalStudentAccount | null>(null);

  useEffect(() => {
    const sync = () => setAccount(readActiveAccount());

    sync();
    window.addEventListener("adaptive-math-learning-account-change", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("adaptive-math-learning-account-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function handleSignOut() {
    signOutAccount();
    window.location.href = "/login";
  }

  return (
    <div className={`account-bar ${account ? `account-accent-${account.accent}` : ""}`}>
      <div className="account-identity">
        <span>{account ? `${formatRole(account.role)} Profile` : "Local Profile"}</span>
        <strong>{account?.name ?? "Guest profile"}</strong>
        <p>{account ? `${account.level} · ${account.goal}` : "Progress is stored in the shared guest profile on this device."}</p>
      </div>
      <div className="account-actions">
        <Link className="button-secondary account-button" href="/login">
          Profiles
        </Link>
        {account && (
          <button className="button-secondary account-button" onClick={handleSignOut} type="button">
            Sign out
          </button>
        )}
      </div>
    </div>
  );
}

function formatRole(value: string) {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
