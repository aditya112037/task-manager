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

import { useAuth } from "../../context/AuthContext";

const Header = ({ toggleDarkMode, darkMode }) => {
  const { user, logout } = useAuth();

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: 1201,
        backgroundColor: (theme) => theme.palette.header?.main || theme.palette.primary.main,
        backgroundImage: 'none',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
      }}
    >
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        
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

          <Typography sx={{ color: "white", display: { xs: 'none', sm: 'block' } }}>
            Welcome, {user?.name}
          </Typography>

          <Button
            variant="outlined"
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