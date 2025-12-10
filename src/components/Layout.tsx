// src/components/Layout.tsx
import { ReactNode } from "react";
import Navbar from "./Navbar";

interface Props {
  children: ReactNode;
}

export default function Layout({ children }: Props) {
  return (
    <div className="app-root">
      <Navbar />
      <main className="app-main">{children}</main>
    </div>
  );
}
