import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const isAuth = localStorage.getItem("aerovhyn_auth") === "true";

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
