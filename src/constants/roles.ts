// Single source of truth for roles and which app sections each role may open.
// Used by middleware (server), the role layouts (client) and API route guards.

export const ROLES = ["admin", "pastor", "leader", "finance", "usher"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  pastor: "Pastor",
  leader: "Leader",
  finance: "Finance",
  usher: "Usher",
};

export const ROLE_HOME: Record<Role, string> = {
  admin: "/admin",
  pastor: "/pastor",
  leader: "/leader",
  finance: "/finance",
  usher: "/usher",
};

export const SECTIONS = ["admin", "pastor", "leader", "finance", "usher"] as const;

export type Section = (typeof SECTIONS)[number];

// Sections each role is allowed into. A role always has access to its own home.
export const ROLE_SECTIONS: Record<Role, readonly Section[]> = {
  admin: ["admin", "finance"],
  pastor: ["pastor"],
  leader: ["leader"],
  finance: ["finance"],
  usher: ["usher"],
};

// Routes any signed-in user with a valid role may open.
export const SHARED_PREFIXES = ["/setting"] as const;

export const isRole = (value: unknown): value is Role =>
  typeof value === "string" && (ROLES as readonly string[]).includes(value);

const matchesPrefix = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export const getSection = (pathname: string): Section | null =>
  SECTIONS.find((section) => matchesPrefix(pathname, `/${section}`)) ?? null;

export const isSharedRoute = (pathname: string) =>
  SHARED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));

export const isProtectedRoute = (pathname: string) =>
  getSection(pathname) !== null || isSharedRoute(pathname);

export const rolesForSection = (section: Section): Role[] =>
  ROLES.filter((role) => ROLE_SECTIONS[role].includes(section));

export const canAccess = (role: Role, pathname: string) => {
  if (isSharedRoute(pathname)) return true;
  const section = getSection(pathname);
  return section === null || ROLE_SECTIONS[role].includes(section);
};
