"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import styles from "./profesional-layout.module.css";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Panel" },
  { href: "/pacientes", label: "Pacientes" },
  { href: "/citas", label: "Agenda" },
  { href: "/tests", label: "Tests" },
  { href: "/consentimientos", label: "Consentimientos" },
];

export default function ProfesionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className={styles.appShell}>
      <aside className={styles.sidebar}>
        <Image src="/logo-mineuri.png" alt="Mineuri" width={120} height={42} className={styles.logo} />
        <div className={styles.role}>Área profesional</div>
        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className={styles.logoutForm}>
          <button className={styles.logoutBtn} onClick={() => signOut({ callbackUrl: "/login" })}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
