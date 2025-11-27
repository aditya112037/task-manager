import React from "react";
import { Link } from "react-router-dom";

const Sidebar = () => {
  return (
    <div>
      

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Link to="/" style={{ color: "#1976d2", textDecoration: "none" }}>
          Dashboard
        </Link>

        <Link to="/teams" style={{ color: "#1976d2", textDecoration: "none" }}>
          Teams
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;
