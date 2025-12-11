import { NavLink } from "react-router-dom";
import policeLogo from "./policelogo.png";
import aerovhynLogo from "./aerovhyn.png";

export default function Navbar() {
  return (
    <header className="navbar">

      {/* LEFT SIDE */}
      <div className="navbar-left">
        <div className="logo-circle">ॐ</div>
        <div className="navbar-title">
          <h1>VIJAYAWADA POLICE BHAVANI DHEEKSHALU CENTRAL COMMAND CONTROL</h1>
          <p>Drone Surveillance & Analytics Console powered by Aerovhyn Private Limited.</p>
        </div>
      </div>

      {/* RIGHT NAVIGATION + LOGOS */}
      <div className="navbar-right">
        <nav className="navbar-links">
          <NavLink to="/master" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            Master
          </NavLink>
          <NavLink to="/feeds" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            Drone Feeds
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            Analytics
          </NavLink>
        </nav>

        <div className="navbar-logos">
          <img src={policeLogo} alt="Police Logo" className="nav-logo" />
          <img src={aerovhynLogo} alt="Aerovhyn Logo" className="nav-logo" />
        </div>
      </div>

    </header>
  );
}
