import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Calendar,
  Church,
  DollarSign,
  Group,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";

export type NavItem = {
  href?: string;           
  label: string;
  icon: LucideIcon;

  children?: Omit<NavItem, "children">[];  
};

export const adminNav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/jemaat", label: "Jemaat", icon: Users },
  { href: "/admin/icare-groups", label: "iCare Groups", icon: Church },
  { href: "/admin/pelayanan", label: "Pelayanan", icon: Group },
  { href: "/admin/events", label: "Events", icon: Calendar },
  // {
  //   label: "Pelayanan",
  //   icon: Group,
  //   children: [
  //     { href: "/admin/pelayanan/department", label: "Department", icon: Group },
  //     { href: "/admin/pelayanan/member", label: "Member", icon: Users },
  //   ],
  // },
  { href: "/admin/reports", label: "Reports", icon: BookOpen },
  // { href: "/admin/settings", label: "Settings", icon: Settings },
];

export const leaderNav: NavItem[] = [
  { href: "/leader", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leader/pertemuan", label: "Pertemuan", icon: BookOpen },
  { href: "/leader/members", label: "Anggota", icon: Users },
  { href: "/leader/reports", label: "Reports", icon: BookOpen },
];

export const financeNav: NavItem[] = [
  { href: "/finance", label: "Dashboard", icon: LayoutDashboard },
  // {
  //   label: "Cashflow",
    
  //   icon: Group,
  //   children: [
  //     { href: "/finance/cashflow", label: "Cash Report", icon: BookOpen },
  //   ],
  // },
  { href: "/finance/categories", label: "Categories", icon: BookOpen },
  { href: "/finance/cashflow", label: "Cashflow", icon: BookOpen },
];

export const usherNav: NavItem[] = [
  { href: "/usher", label: "Dashboard", icon: LayoutDashboard },
  { href: "/usher/attendance", label: "Attendance", icon: Calendar },
  { href: "/usher/attendance/history", label: "History", icon: BookOpen },
];

export const navByRole: Record<string, NavItem[]> = {
  admin: adminNav,
  leader: leaderNav,
  finance: financeNav,
  usher: usherNav,
};