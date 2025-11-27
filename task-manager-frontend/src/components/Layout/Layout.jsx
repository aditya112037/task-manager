import React, { useState } from "react";
import { Box } from "@mui/material";
import Sidebar from "./Sidebar";
import Header from "./Header";

const Layout = ({ children, toggleDarkMode, darkMode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar open={sidebarOpen} toggleSidebar={toggleSidebar} />

      <Box
        sx={{
          flexGrow: 1,
          minHeight: "100vh",
          backgroundColor: (theme) => theme.palette.background.default,
          ml: sidebarOpen ? "220px" : "70px",
          transition: "all 0.3s ease",
        }}
      >
        <Header
          sidebarOpen={sidebarOpen}
          toggleDarkMode={toggleDarkMode}
          darkMode={darkMode}
        />

        <Box sx={{ mt: 10, p: 3 }}>{children}</Box>
      </Box>
    </Box>
  );
};

export default Layout;
