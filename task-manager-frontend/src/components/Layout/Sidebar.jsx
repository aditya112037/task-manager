import React, { useState } from "react";
import {
  Drawer,
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Toolbar,
  Tooltip,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import TaskIcon from "@mui/icons-material/Checklist";
import GroupIcon from "@mui/icons-material/Group";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { Link, useLocation } from "react-router-dom";

const Sidebar = () => {
  const [open, setOpen] = useState(true);
  const location = useLocation();

  const toggleSidebar = () => setOpen(!open);

  const menuItems = [
    { label: "Dashboard", icon: <DashboardIcon />, path: "/" },
    { label: "My Tasks", icon: <TaskIcon />, path: "/tasks" },
    { label: "Teams", icon: <GroupIcon />, path: "/teams" },
  ];

  return (
    <Drawer
      variant="permanent"
      open={open}
      sx={{
        width: open ? 220 : 70,
        transition: "width 0.3s",
        "& .MuiDrawer-paper": {
          width: open ? 220 : 70,
          background: "#1976d2",
          color: "white",
          border: "none",
          transition: "width 0.3s",
        },
      }}
    >
      {/* TOP: TOGGLE BUTTON */}
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: open ? "flex-end" : "center",
          padding: "10px",
        }}
      >
        <IconButton onClick={toggleSidebar} sx={{ color: "white" }}>
          {open ? <ChevronLeftIcon /> : <MenuIcon />}
        </IconButton>
      </Toolbar>

      {/* MENU ITEMS */}
      <List>
        {menuItems.map((item) => {
          if (location.pathname === item.path) return null; // hide current page

          return (
            <Tooltip title={open ? "" : item.label} placement="right" key={item.path}>
              <ListItemButton
                component={Link}
                to={item.path}
                sx={{
                  color: "white",
                  "&.Mui-selected": {
                    background: "rgba(255,255,255,0.2)",
                  },
                }}
                selected={location.pathname === item.path}
              >
                <ListItemIcon sx={{ color: "white" }}>{item.icon}</ListItemIcon>

                {open && <ListItemText primary={item.label} />}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>
    </Drawer>
  );
};

export default Sidebar;
