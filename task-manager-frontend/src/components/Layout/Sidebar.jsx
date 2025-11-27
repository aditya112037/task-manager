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
    { label: "Teams", icon: <GroupIcon />, path: "/teams" },
  ];

  return (
    <Drawer
      variant="permanent"
      open={open}
      sx={{
        width: open ? 220 : 70,
        flexShrink: 0,
        whiteSpace: "nowrap",
        transition: "width 0.25s ease-out",
        "& .MuiDrawer-paper": {
          width: open ? 220 : 70,
          background: "#1976d2",
          color: "white",
          border: "none",
          transition: "width 0.25s ease-out",
          overflow: "hidden",
        },
      }}
    >
      {/* Toggle Button */}
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: open ? "flex-end" : "center",
          alignItems: "center",
          padding: "8px",
          minHeight: "64px !important",
        }}
      >
        <IconButton
          onClick={toggleSidebar}
          sx={{ color: "white", "&:hover": { background: "rgba(255,255,255,0.1)" } }}
        >
          {open ? <ChevronLeftIcon /> : <MenuIcon />}
        </IconButton>
      </Toolbar>

      {/* Menu Items */}
      <List sx={{ mt: 1 }}>
        {menuItems.map((item) => {
          if (location.pathname === item.path) return null; // hide current page

          return (
            <Tooltip key={item.path} title={!open ? item.label : ""} placement="right">
              <ListItemButton
                component={Link}
                to={item.path}
                selected={location.pathname === item.path}
                sx={{
                  borderRadius: open ? "8px" : "50%",
                  mx: "4px",
                  my: "6px",
                  color: "white",
                  "&.Mui-selected": {
                    background: "rgba(255,255,255,0.25)",
                  },
                  "&:hover": {
                    background: "rgba(255,255,255,0.15)",
                  },
                  transition: "all 0.2s ease",
                  px: open ? 2 : 1.5,
                }}
              >
                <ListItemIcon
                  sx={{
                    color: "white",
                    minWidth: "40px",
                    justifyContent: "center",
                  }}
                >
                  {item.icon}
                </ListItemIcon>

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
