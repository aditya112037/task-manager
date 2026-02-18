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

const Header = ({ toggleDarkMode, darkMode, sidebarOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();

  const sidebarWidthOpen = 240;
  const sidebarWidthClosed = 64;

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: 1201,
        backgroundColor: (theme) => theme.palette.header?.main || theme.palette.primary.main,
        backgroundImage: "none",
        width: {
          xs: "100%",
          md: `calc(100% - ${sidebarOpen ? sidebarWidthOpen : sidebarWidthClosed}px)`,
        },
        left: {
          xs: 0,
          md: `${sidebarOpen ? sidebarWidthOpen : sidebarWidthClosed}px`,
        },
        right: 0,
        transition: (theme) => theme.transitions.create(["width", "left"], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
        height: "68px",
      }}
    >
      <Toolbar sx={{
        display: "flex",
        justifyContent: "space-between",
        minHeight: "68px !important",
        pl: { xs: 1, sm: 2 },
        pr: { xs: 1, sm: 2 },
        gap: 1,
      }}>
        <IconButton
          color="inherit"
          onClick={toggleSidebar}
          sx={{
            mr: 1.5,
            display: { xs: "flex", md: "none" },
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 2,
          }}
        >
          <MenuIcon />
        </IconButton>

        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: "sidebar.text",
            letterSpacing: 0.45,
            fontSize: { xs: "1rem", sm: "1.18rem" },
          }}
        >
          Atlas Task Suite
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 1.5 } }}>
          <IconButton
            sx={{
              color: "sidebar.text",
              border: "1px solid rgba(255,255,255,0.2)",
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.1)",
              }
            }} 
            onClick={toggleDarkMode}
          >
            {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>

          <Typography sx={{
            color: "sidebar.text",
            display: { xs: "none", sm: "block" },
            fontSize: "0.88rem",
            opacity: 0.9,
          }}>
            {user?.name}
          </Typography>

          <Button
            variant="outlined"
            size="small"
            sx={{
              color: "sidebar.text",
              borderColor: "rgba(255,255,255,0.26)",
              minWidth: { xs: "auto", sm: 80 },
              px: { xs: 1, sm: 1.5 },
              "&:hover": {
                borderColor: "rgba(255,255,255,0.42)",
                backgroundColor: "rgba(255,255,255,0.1)",
              }
            }}
            onClick={logout}
          >
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Logout</Box>
            <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>Out</Box>
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
