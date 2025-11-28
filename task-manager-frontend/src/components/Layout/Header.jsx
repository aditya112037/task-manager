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

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: 1201,
        backgroundColor: (theme) => theme.palette.header?.main || theme.palette.primary.main,
        backgroundImage: 'none',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        width: `calc(100% - ${sidebarOpen ? 240 : 64}px)`,
        marginLeft: sidebarOpen ? '240px' : '64px',
        transition: theme => theme.transitions.create(['width', 'margin'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
        height: '60px', // Reduced header height
      }}
    >
      <Toolbar sx={{ 
        display: "flex", 
        justifyContent: "space-between",
        minHeight: '60px !important', // Reduced toolbar height
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
            fontSize: '0.9rem' // Slightly smaller text
          }}>
            Welcome, {user?.name}
          </Typography>

          <Button
            variant="outlined"
            size="small" // Smaller button
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