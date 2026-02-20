import React from "react";
import { AppBar, Box, Button, Container, Stack, Toolbar, Typography, useTheme } from "@mui/material";
import { Link, useLocation } from "react-router-dom";

const publicNavItems = [
  { label: "Features", to: "/features" },
  { label: "Pricing", to: "/pricing" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
  { label: "Security", to: "/security" },
  { label: "Blog", to: "/blog" },
];

const MarketingLayout = ({ title, subtitle, children, embedded = false }) => {
  const theme = useTheme();
  const location = useLocation();

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {!embedded && (
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            borderBottom: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
            backdropFilter: "blur(16px)",
            color: "text.primary",
          }}
        >
          <Toolbar sx={{ py: 0.5 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: "100%" }}>
              <Stack direction="row" alignItems="baseline" spacing={1}>
                <Typography
                  component={Link}
                  to="/"
                  variant="h5"
                  sx={{ color: "text.primary", textDecoration: "none", lineHeight: 1 }}
                >
                  Task Suite
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1} sx={{ display: { xs: "none", lg: "flex" } }}>
                {publicNavItems.map((item) => {
                  const active = location.pathname === item.to;
                  return (
                    <Button
                      key={item.to}
                      component={Link}
                      to={item.to}
                      variant={active ? "contained" : "text"}
                      color={active ? "primary" : "inherit"}
                      size="small"
                    >
                      {item.label}
                    </Button>
                  );
                })}
              </Stack>

              <Stack direction="row" spacing={1}>
                <Button component={Link} to="/login" variant="outlined" size="small">
                  Login
                </Button>
                <Button component={Link} to="/register" variant="contained" size="small">
                  Get Started
                </Button>
              </Stack>
            </Stack>
          </Toolbar>
        </AppBar>
      )}

      <Container sx={{ py: { xs: 5, md: 8 }, flexGrow: 1 }}>
        {(title || subtitle) && (
          <Box sx={{ mb: 4 }}>
            {title && (
              <Typography variant="h2" sx={{ mb: 1.5 }}>
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="h6" sx={{ color: "text.secondary", maxWidth: 860 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        )}
        {children}
      </Container>

      {!embedded && (
        <Box
          component="footer"
          sx={{
            mt: "auto",
            borderTop: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <Container sx={{ py: 3.5 }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
            >
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  Task Suite
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Professional project execution for modern teams.
                </Typography>
              </Box>
              <Stack direction="row" spacing={0.4} sx={{ flexWrap: "wrap" }}>
                {publicNavItems.map((item) => (
                  <Button key={item.to} component={Link} to={item.to} size="small" variant="text">
                    {item.label}
                  </Button>
                ))}
              </Stack>
            </Stack>
          </Container>
        </Box>
      )}
    </Box>
  );
};

export default MarketingLayout;
