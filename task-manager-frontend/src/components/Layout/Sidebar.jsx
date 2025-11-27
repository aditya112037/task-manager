import React from "react";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  IconButton,
  Tooltip
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import DashboardIcon from "@mui/icons-material/Dashboard";
import GroupIcon from "@mui/icons-material/Group";

import { Link, useLocation } from "react-router-dom";
import { useTheme } from "@mui/material/styles";

const Sidebar = ({ open, toggleSidebar }) => {
  const location = useLocation();
  const theme = useTheme();

  const widthOpen = 220;
  const widthClosed = 70;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? widthOpen : widthClosed,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: open ? widthOpen : widthClosed,
          background: theme.palette.sidebar.main,
          color: "white",
          border: "none",
          overflowX: "hidden",
          transition: "width 0.3s ease",
        },
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: open ? "flex-end" : "center",
          py: 1,
        }}
      >
        <IconButton sx={{ color: "white" }} onClick={toggleSidebar}>
          {open ? <ChevronLeftIcon /> : <MenuIcon />}
        </IconButton>
      </Toolbar>

      <List>
        <ListItemButton
          component={Link}
          to="/"
          selected={location.pathname === "/"}
          sx={{ color: "white" }}
        >
          <ListItemIcon sx={{ color: "white" }}>
            <DashboardIcon />
          </ListItemIcon>
          {open && <ListItemText primary="Dashboard" />}
        </ListItemButton>

        <ListItemButton
          component={Link}
          to="/teams"
          selected={location.pathname.startsWith("/teams")}
          sx={{ color: "white" }}
        >
          <ListItemIcon sx={{ color: "white" }}>
            <GroupIcon />
          </ListItemIcon>
          {open && <ListItemText primary="Teams" />}
        </ListItemButton>
      </List>

    </Drawer>
  );
};

export default Sidebar;
