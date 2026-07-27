import AppShell from "../ui/AppShell";
import AccountManager from "../ui/AccountManager";

export default function AccountsPage() {
  return (
    <AppShell activeRoute="/accounts">
      <AccountManager />
    </AppShell>
  );
}
