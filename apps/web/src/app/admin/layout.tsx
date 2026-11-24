import { StaffSessionProvider } from "@/lib/staff-session";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <StaffSessionProvider>{children}</StaffSessionProvider>;
}
