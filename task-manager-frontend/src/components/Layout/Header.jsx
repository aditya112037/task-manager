import React from "react";
import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import { useAuth } from "../../context/AuthContext";

const Header = () => {
  const { user, logout } = useAuth();

  return (
    <AppBar
      position="static"
      elevation={2}
      sx={{
        background: "#1976d2",
        borderRadius: 0,
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          py: 1,
        }}
      >
        {/* LOGO / TITLE */}
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, letterSpacing: 0.5 }}
        >
          Task Manager
        </Typography>

        {/* USER & LOGOUT */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 500 }}
          >
            Welcome, {user?.name}
          </Typography>

          <Button
            variant="outlined"
            color="inherit"
            onClick={logout}
            sx={{
              textTransform: "none",
              borderColor: "white",
              color: "white",
              "&:hover": {
                borderColor: "white",
                background: "rgba(255,255,255,0.1)",
              },
            }}
          >
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
