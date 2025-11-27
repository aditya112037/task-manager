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
          color: theme.palette.sidebar.text,
          border: "none",
          overflowX: "hidden",
          transition: "width 0.3s ease, background-color 0.3s ease",
          boxShadow: theme.palette.mode === 'dark' ? '2px 0 8px rgba(0,0,0,0.3)' : '2px 0 8px rgba(0,0,0,0.1)',
        },
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: open ? "flex-end" : "center",
          py: 1,
          minHeight: '64px !important',
        }}
      >
        <IconButton 
          sx={{ 
            color: theme.palette.sidebar.text,
            '&:hover': {
              backgroundColor: theme.palette.sidebar.hover,
            }
          }} 
          onClick={toggleSidebar}
        >
          {open ? <ChevronLeftIcon /> : <MenuIcon />}
        </IconButton>
      </Toolbar>

      <List sx={{ px: 1 }}>
        <ListItemButton
          component={Link}
          to="/"
          selected={location.pathname === "/"}
          sx={{
            color: theme.palette.sidebar.text,
            borderRadius: 2,
            mb: 1,
            '&.Mui-selected': {
              backgroundColor: theme.palette.sidebar.hover,
              '&:hover': {
                backgroundColor: theme.palette.sidebar.hover,
              }
            },
            '&:hover': {
              backgroundColor: theme.palette.sidebar.hover,
            }
          }}
        >
          <ListItemIcon sx={{ color: theme.palette.sidebar.text, minWidth: 40 }}>
            <DashboardIcon />
          </ListItemIcon>
          {open && <ListItemText primary="Dashboard" />}
        </ListItemButton>

        <ListItemButton
          component={Link}
          to="/teams"
          selected={location.pathname.startsWith("/teams")}
          sx={{
            color: theme.palette.sidebar.text,
            borderRadius: 2,
            mb: 1,
            '&.Mui-selected': {
              backgroundColor: theme.palette.sidebar.hover,
              '&:hover': {
                backgroundColor: theme.palette.sidebar.hover,
              }
            },
            '&:hover': {
              backgroundColor: theme.palette.sidebar.hover,
            }
          }}
        >
          <ListItemIcon sx={{ color: theme.palette.sidebar.text, minWidth: 40 }}>
            <GroupIcon />
          </ListItemIcon>
          {open && <ListItemText primary="Teams" />}
        </ListItemButton>
      </List>
    </Drawer>
  );
};

export default Sidebar;
