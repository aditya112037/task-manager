import React from "react";
import { Link } from "react-router-dom";

const Sidebar = () => {
  return (
    <div style={{ width: 220, padding: 20 }}>
      <h3>Menu</h3>
      <Link to="/dashboard">Dashboard</Link><br/>
      <Link to="/tasks">My Tasks</Link><br/>
      <Link to="/teams">Teams</Link>
    </div>
  );
};

export default Sidebar;
