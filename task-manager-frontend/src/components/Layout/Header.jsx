import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  IconButton
} from "@mui/material";

import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import MenuIcon from "@mui/icons-material/Menu";

import { useAuth } from "../../context/AuthContext";

const Header = ({
  toggleDarkMode,
  darkMode,
  sidebarOpen,
  sidebarWidthOpen,
  sidebarWidthClosed,
  toggleSidebar
}) => {
  const { user, logout } = useAuth();

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: 1201,
        ml: sidebarOpen ? `${sidebarWidthOpen}px` : `${sidebarWidthClosed}px`,
        width: `calc(100% - ${
          sidebarOpen ? sidebarWidthOpen : sidebarWidthClosed
        }px)`,
        transition: "all 0.3s ease",
      }}
    >
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton sx={{ color: "white" }} onClick={toggleSidebar}>
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Task Manager
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton sx={{ color: "white" }} onClick={toggleDarkMode}>
            {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>

          <Typography sx={{ color: "white" }}>
            Welcome, {user?.name}
          </Typography>

          <Button
            variant="outlined"
            sx={{ color: "white", borderColor: "white" }}
            onClick={logout}
          >
            Logout
          </Button>
        </Box>

      </Toolbar>
    </AppBar>
  );
};

export default Header;
