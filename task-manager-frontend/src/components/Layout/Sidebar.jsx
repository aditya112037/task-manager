import React from "react";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  IconButton,
  useTheme,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import DashboardIcon from "@mui/icons-material/Dashboard";
import GroupIcon from "@mui/icons-material/Group";

import { Link, useLocation } from "react-router-dom";

const Sidebar = ({ open, toggleSidebar }) => {
  const location = useLocation();
  const theme = useTheme();

  const widthOpen = 240;
  const widthClosed = 64;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? widthOpen : widthClosed,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        '& .MuiDrawer-paper': {
          width: open ? widthOpen : widthClosed,
          background: theme.palette.sidebar.main,
          color: theme.palette.sidebar.text,
          border: 'none',
          overflowX: 'hidden',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          // REMOVE any right border or shadow that creates gap
          boxShadow: 'none',
          borderRight: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          // Ensure it's flush with the edge
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        },
      }}
    >
      {/* Header with Toggle Button */}
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'flex-end' : 'center',
          px: 1,
          minHeight: '64px !important',
        }}
      >
        <IconButton 
          onClick={toggleSidebar}
          sx={{
            color: theme.palette.sidebar.text,
            '&:hover': {
              backgroundColor: theme.palette.sidebar.hover,
            }
          }}
        >
          {open ? <ChevronLeftIcon /> : <MenuIcon />}
        </IconButton>
      </Toolbar>

      {/* Navigation Items */}
      <List sx={{ px: 1 }}>
        {/* Dashboard */}
        <ListItemButton
          component={Link}
          to="/"
          selected={location.pathname === "/"}
          sx={{
            color: theme.palette.sidebar.text,
            borderRadius: 1, // Reduced border radius
            mb: 1,
            justifyContent: open ? 'initial' : 'center',
            px: open ? 2 : 1,
            minHeight: 48,
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
          <ListItemIcon 
            sx={{
              color: theme.palette.sidebar.text,
              minWidth: 0,
              mr: open ? 2 : 'auto',
              justifyContent: 'center',
            }}
          >
            <DashboardIcon />
          </ListItemIcon>
          {open && (
            <ListItemText 
              primary="Dashboard" 
              sx={{ opacity: open ? 1 : 0 }}
            />
          )}
        </ListItemButton>

        {/* Teams */}
        <ListItemButton
          component={Link}
          to="/teams"
          selected={location.pathname.startsWith("/teams")}
          sx={{
            color: theme.palette.sidebar.text,
            borderRadius: 1, // Reduced border radius
            mb: 1,
            justifyContent: open ? 'initial' : 'center',
            px: open ? 2 : 1,
            minHeight: 48,
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
          <ListItemIcon 
            sx={{
              color: theme.palette.sidebar.text,
              minWidth: 0,
              mr: open ? 2 : 'auto',
              justifyContent: 'center',
            }}
          >
            <GroupIcon />
          </ListItemIcon>
          {open && (
            <ListItemText 
              primary="Teams" 
              sx={{ opacity: open ? 1 : 0 }}
            />
          )}
        </ListItemButton>
      </List>
    </Drawer>
  );
};

export default Sidebar;