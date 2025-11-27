import React, { useState } from "react";
import { Box } from "@mui/material";
import Sidebar from "./Sidebar";
import Header from "./Header";

const Layout = ({ children, toggleDarkMode, darkMode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const sidebarWidthOpen = 220;
  const sidebarWidthClosed = 70;

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>

      <Sidebar open={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <Box
        sx={{
          flexGrow: 1,
          backgroundColor: (theme) => theme.palette.background.default,
          ml: sidebarOpen ? `${sidebarWidthOpen}px` : `${sidebarWidthClosed}px`,
          transition: "margin-left 0.3s ease",
          overflowY: "auto",
        }}
      >
        <Header
          toggleDarkMode={toggleDarkMode}
          darkMode={darkMode}
          sidebarOpen={sidebarOpen}
          sidebarWidthOpen={sidebarWidthOpen}
          sidebarWidthClosed={sidebarWidthClosed}
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <Box sx={{ mt: 10, p: 3 }}>
          {children}
        </Box>

      </Box>

    </Box>
  );
};

export default Layout;
