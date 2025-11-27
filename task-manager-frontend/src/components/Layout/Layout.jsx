import React from "react";
import { Box } from "@mui/material";
import Sidebar from "./Sidebar";
import Header from "./Header";

const Layout = ({ children }) => {
  return (
    <Box sx={{ display: "flex" }}>
      
      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT AREA */}
      <Box sx={{ flexGrow: 1, background: "#f9f9f9", minHeight: "100vh" }}>
        <Header />
        <Box sx={{ mt: 10, p: 3 }}>{children}</Box>
      </Box>

    </Box>
  );
};

export default Layout;
