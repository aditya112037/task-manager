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
import { styled } from "@mui/material/styles";
import { Link, useLocation } from "react-router-dom";

const drawerWidth = 220;

// ⭐ MINI DRAWER STYLE FIXES
const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: "hidden",
});

const closedMixin = (theme) => ({
  width: 70,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: "hidden",
});

// ⭐ Styled Drawer
const StyledDrawer = styled(Drawer)(
  ({ theme, open }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: "nowrap",
    boxSizing: "border-box",
    ...(open && {
      ...openedMixin(theme),
      "& .MuiDrawer-paper": openedMixin(theme),
    }),
    ...(!open && {
      ...closedMixin(theme),
      "& .MuiDrawer-paper": closedMixin(theme),
    }),
  })
);

const Sidebar = () => {
  const [open, setOpen] = useState(true);
  const location = useLocation();

  const toggleSidebar = () => setOpen(!open);

  const menuItems = [
    { label: "Dashboard", icon: <DashboardIcon />, path: "/" },
    { label: "Teams", icon: <GroupIcon />, path: "/teams" },
  ];

  return (
    <StyledDrawer variant="permanent" open={open}>
      {/* Toggle Button */}
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: open ? "flex-end" : "center",
          alignItems: "center",
          padding: "8px",
          minHeight: "64px !important",
          background: "#1976d2",
        }}
      >
        <IconButton onClick={toggleSidebar} sx={{ color: "white" }}>
          {open ? <ChevronLeftIcon /> : <MenuIcon />}
        </IconButton>
      </Toolbar>

      <List sx={{ background: "#1976d2", height: "100%", color: "white" }}>
        {menuItems.map((item) => {
          if (location.pathname === item.path) return null; // hide current page

          return (
            <Tooltip title={!open ? item.label : ""} placement="right" key={item.path}>
              <ListItemButton
                component={Link}
                to={item.path}
                selected={location.pathname === item.path}
                sx={{
                  px: open ? 2 : 1.5,
                  borderRadius: open ? "8px" : "50%",
                  mx: open ? 1 : 0,
                  my: 1,
                  "&.Mui-selected": {
                    background: "rgba(255,255,255,0.25)",
                  },
                  "&:hover": {
                    background: "rgba(255,255,255,0.15)",
                  },
                }}
              >
                <ListItemIcon sx={{ color: "white", minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                {open && <ListItemText primary={item.label} />}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>
    </StyledDrawer>
  );
};

export default Sidebar;
