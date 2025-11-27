import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  IconButton,
} from "@mui/material";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "@mui/material/styles";

const Header = ({ toggleDarkMode, darkMode, sidebarOpen }) => {
  const theme = useTheme();
  const { user, logout } = useAuth();

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: 1201,
        background: theme.palette.header.main,
        width: `calc(100% - ${sidebarOpen ? 220 : 70}px)`,
        ml: `${sidebarOpen ? 220 : 70}px`,
        transition: "all 0.3s ease",
      }}
    >
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="h6" sx={{ fontWeight: "bold" }}>
          Task Manager
        </Typography>

        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <IconButton onClick={toggleDarkMode} sx={{ color: "white" }}>
            {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>

          <Typography sx={{ color: "white" }}>
            Welcome, {user?.name}
          </Typography>

          <Button
            variant="outlined"
            size="small"
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
