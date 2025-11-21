import React from "react";
import Header from "./Header";
import { Box, Container } from "@mui/material";

const Layout = ({ children }) => {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#f5f7fa",
      }}
    >
      {/* Top Navigation */}
      <Header />

      {/* Main Content */}
      <Container
        maxWidth="md"
        sx={{
          mt: 4,
          mb: 4,
        }}
      >
        {children}
      </Container>
    </Box>
  );
};

export default Layout;
