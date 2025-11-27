import React from "react";
import { Box } from "@mui/material";
import Sidebar from "./Sidebar";
import Header from "./Header";

const Layout = ({ children, toggleDarkMode, darkMode }) => {
  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      
      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <Box
        sx={{
          flexGrow: 1,
          minHeight: "100vh",
          backgroundColor: (theme) => theme.palette.background.default,
          overflowY: "auto",
        }}
      >
        <Header toggleDarkMode={toggleDarkMode} darkMode={darkMode} />

        {/* PAGE CONTENT */}
        <Box sx={{ mt: 10, p: 3 }}>
          {children}
        </Box>
      </Box>

    </Box>
  );
};

export default Layout;
