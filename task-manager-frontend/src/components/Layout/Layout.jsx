import React from "react";
import { Box } from "@mui/material";
import Sidebar from "./Sidebar";
import Header from "./Header";

const Layout = ({ children, toggleDarkMode, darkMode }) => {
  return (
    <Box sx={{ display: "flex" }}>
      <Sidebar />

      <Box sx={{ flexGrow: 1, minHeight: "100vh" }}>
        <Header toggleDarkMode={toggleDarkMode} darkMode={darkMode} />
        <Box sx={{ mt: 10, p: 3 }}>{children}</Box>
      </Box>
    </Box>
  );
};

export default Layout;
