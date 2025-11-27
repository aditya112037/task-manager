import React from "react";
import { Box } from "@mui/material";
import Header from "./Header";
import Sidebar from "./Sidebar";

const Layout = ({ children }) => {
  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      
      {/* LEFT SIDEBAR */}
      <Box
        sx={{
          width: 220,
          backgroundColor: "#f8f9fa",
          borderRight: "1px solid #e0e0e0",
          p: 2,
          pt: 4,
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          overflowY: "auto",
        }}
      >
        <Sidebar />
      </Box>

      {/* MAIN CONTENT */}
      <Box
        sx={{
          flex: 1,
          ml: "220px", // leave space for sidebar
          display: "flex",
          flexDirection: "column",
          height: "100vh",
        }}
      >
        <Header />

        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            p: 3,
            mt: 8, // space for header
          }}
        >
          {children}
        </Box>
      </Box>

    </Box>
  );
};

export default Layout;
