import React, { useState } from "react";
import { Box } from "@mui/material";
import Sidebar from "./Sidebar";
import Header from "./Header";

const Layout = ({ children, toggleDarkMode, darkMode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const sidebarWidthOpen = 240;
  const sidebarWidthClosed = 64;

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Main Content - Make it flush with sidebar */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          backgroundColor: (theme) => theme.palette.background.default,
          width: `calc(100% - ${sidebarOpen ? sidebarWidthOpen : sidebarWidthClosed}px)`,
          marginLeft: `${sidebarOpen ? sidebarWidthOpen : sidebarWidthClosed}px`,
          transition: theme => theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          overflowY: "auto",
          minHeight: '100vh',
          // Remove any left padding/margin that creates gap
          paddingLeft: 1,
          marginLeft: 1,
        }}
      >
        {/* Header */}
        <Header
          toggleDarkMode={toggleDarkMode}
          darkMode={darkMode}
          sidebarOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
        />

        {/* Page Content */}
        <Box sx={{ p: 2, pl: 1 }}> {/* Remove left padding */}
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;