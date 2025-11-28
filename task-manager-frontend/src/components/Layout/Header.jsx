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
        backgroundImage: 'none',
        // Remove shadow that might create visual separation
        boxShadow: 'none',
        // Make it flush with sidebar
        width: `calc(100% - ${sidebarOpen ? sidebarWidthOpen : sidebarWidthClosed}px)`,
        left: `${sidebarOpen ? sidebarWidthOpen : sidebarWidthClosed}px`,
        right: 0,
        transition: theme => theme.transitions.create(['width', 'left'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
        height: '60px',
      }}
    >
      <Toolbar sx={{ 
        display: "flex", 
        justifyContent: "space-between",
        minHeight: '60px !important',
        // Remove any left padding
        pl: 2,
      }}>
        {/* Sidebar Toggle Button for Mobile/Alternative */}
        <IconButton
          color="inherit"
          onClick={toggleSidebar}
          sx={{ mr: 2, display: { xs: 'flex', md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        
        <Typography variant="h6" sx={{ fontWeight: "bold", color: "white" }}>
          Task Manager
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton 
            sx={{ 
              color: "white",
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.1)',
              }
            }} 
            onClick={toggleDarkMode}
          >
            {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>

          <Typography sx={{ 
            color: "white", 
            display: { xs: 'none', sm: 'block' },
            fontSize: '0.9rem'
          }}>
            Welcome, {user?.name}
          </Typography>

          <Button
            variant="outlined"
            size="small"
            sx={{ 
              color: "white", 
              borderColor: "white",
              '&:hover': {
                borderColor: "white",
                backgroundColor: 'rgba(255,255,255,0.1)',
              }
            }}
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