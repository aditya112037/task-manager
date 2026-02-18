import React from "react";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  IconButton,
  Box,
  Typography,
  useTheme,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import DashboardIcon from "@mui/icons-material/Dashboard";
import GroupIcon from "@mui/icons-material/Group";

import { Link, useLocation } from "react-router-dom";

const Sidebar = ({ open, toggleSidebar, isMobile = false }) => {
  const location = useLocation();
  const theme = useTheme();

  const widthOpen = 240;
  const widthClosed = 64;
  const drawerWidth = isMobile ? widthOpen : open ? widthOpen : widthClosed;
  const showLabel = isMobile || open;

  return (
    <Drawer
      variant={isMobile ? "temporary" : "permanent"}
      open={isMobile ? open : true}
      onClose={toggleSidebar}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        whiteSpace: "nowrap",
        boxSizing: "border-box",
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          background: theme.palette.sidebar.main,
          color: theme.palette.sidebar.text,
          border: "none",
          overflowX: "hidden",
          transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          borderRight: `1px solid ${theme.palette.divider}`,
          boxShadow: "24px 0 48px rgba(0,0,0,0.15)",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
        },
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: showLabel ? "space-between" : "center",
          px: 1,
          minHeight: "68px !important",
        }}
      >
        {showLabel && (
          <Box sx={{ pl: 1.2 }}>
            <Typography variant="subtitle2" sx={{ color: "sidebar.text", opacity: 0.75 }}>
              Workspace
            </Typography>
            <Typography variant="body2" sx={{ color: "sidebar.text", letterSpacing: 0.5, fontWeight: 700 }}>
              Premium Flow
            </Typography>
          </Box>
        )}
        <IconButton
          onClick={toggleSidebar}
          sx={{
            color: theme.palette.sidebar.text,
            "&:hover": {
              backgroundColor: theme.palette.sidebar.hover,
            }
          }}
        >
          {open ? <ChevronLeftIcon /> : <MenuIcon />}
        </IconButton>
      </Toolbar>

      <List sx={{ px: 1 }}>
        <ListItemButton
          component={Link}
          to="/"
          onClick={isMobile ? toggleSidebar : undefined}
          selected={location.pathname === "/"}
          sx={{
            color: theme.palette.sidebar.text,
            borderRadius: 2,
            mb: 1,
            justifyContent: showLabel ? "initial" : "center",
            px: showLabel ? 2 : 1,
            minHeight: 50,
            "&.Mui-selected": {
              backgroundColor: theme.palette.sidebar.active || theme.palette.sidebar.hover,
              "&:hover": {
                backgroundColor: theme.palette.sidebar.active || theme.palette.sidebar.hover,
              }
            },
            "&:hover": {
              backgroundColor: theme.palette.sidebar.hover,
            }
          }}
        >
          <ListItemIcon
            sx={{
              color: theme.palette.sidebar.text,
              minWidth: 0,
              mr: showLabel ? 2 : "auto",
              justifyContent: "center",
            }}
          >
            <DashboardIcon />
          </ListItemIcon>
          {showLabel && (
            <ListItemText 
              primary="Dashboard" 
              sx={{ opacity: showLabel ? 1 : 0 }}
            />
          )}
        </ListItemButton>

        <ListItemButton
          component={Link}
          to="/teams"
          onClick={isMobile ? toggleSidebar : undefined}
          selected={location.pathname.startsWith("/teams")}
          sx={{
            color: theme.palette.sidebar.text,
            borderRadius: 2,
            mb: 1,
            justifyContent: showLabel ? "initial" : "center",
            px: showLabel ? 2 : 1,
            minHeight: 50,
            "&.Mui-selected": {
              backgroundColor: theme.palette.sidebar.active || theme.palette.sidebar.hover,
              "&:hover": {
                backgroundColor: theme.palette.sidebar.active || theme.palette.sidebar.hover,
              }
            },
            "&:hover": {
              backgroundColor: theme.palette.sidebar.hover,
            }
          }}
        >
          <ListItemIcon
            sx={{
              color: theme.palette.sidebar.text,
              minWidth: 0,
              mr: showLabel ? 2 : "auto",
              justifyContent: "center",
            }}
          >
            <GroupIcon />
          </ListItemIcon>
          {showLabel && (
            <ListItemText 
              primary="Teams" 
              sx={{ opacity: showLabel ? 1 : 0 }}
            />
          )}
        </ListItemButton>
      </List>
    </Drawer>
  );
};

export default Sidebar;
