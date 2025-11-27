import React, { useState } from "react";
import { Box } from "@mui/material";
import Sidebar from "./Sidebar";
import Header from "./Header";

const Layout = ({ children, toggleDarkMode, darkMode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      
      {/* SIDEBAR */}
      <Sidebar open={sidebarOpen} toggleSidebar={toggleSidebar} />

      {/* MAIN CONTENT */}
      <Box
        sx={{
          flexGrow: 1,
          minHeight: "100vh",
          backgroundColor: (theme) => theme.palette.background.default,
          ml: sidebarOpen ? "220px" : "70px",
          transition: "all 0.3s ease",
          overflowY: "auto",
        }}
      >
        <Header
          toggleDarkMode={toggleDarkMode}
          darkMode={darkMode}
          toggleSidebar={toggleSidebar}
        />

        <Box sx={{ mt: 10, p: 3 }}>{children}</Box>
      </Box>

    </Box>
  );
};

export default Layout;
