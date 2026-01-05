// src/components/Layout.tsx
import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

interface Props {
  children?: ReactNode; // ✅ OPTIONAL
}

export default function Layout({ children }: Props) {
  return (
    <>
      <Navbar />
      {children ?? <Outlet />}
    </>
  );
}
