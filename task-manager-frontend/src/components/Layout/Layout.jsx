import React from "react";
import { Box } from "@mui/material";
import Header from "./Header";
import Sidebar from "./Sidebar";

const Layout = ({ children }) => {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      
      {/* Sidebar */}
      <Box
        sx={{
          width: 220,
          backgroundColor: "#f5f5f5",
          borderRight: "1px solid #ddd",
        }}
      >
        <Sidebar />
      </Box>

      {/* Main Content Area */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Header />
        
        <Box sx={{ mt: 8, p: 3 }}>
          {children}
        </Box>
      </Box>

    </Box>
  );
};

export default Layout;
