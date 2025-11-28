import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Divider,
} from "@mui/material";
import { useAuth } from "../../context/AuthContext";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL;
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      setLoading(true);
      await login(formData.email, formData.password);
      navigate("/");
    } catch (error) {
      setError(error.response?.data?.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        p: 2,
      }}
    >
      <Card
        sx={{
          width: "100%",
          maxWidth: 400,
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            align="center"
            fontWeight="bold"
            color="primary"
          >
            Login to Task Manager
          </Typography>

          {error && (
            <Typography
              color="error"
              align="center"
              sx={{ mb: 2 }}
            >
              {error}
            </Typography>
          )}

          <Button
            fullWidth
            variant="outlined"
            onClick={handleGoogleLogin}
            startIcon={
              <img
                src="https://developers.google.com/identity/images/g-logo.png"
                alt="Google"
                width="20"
                height="20"
              />
            }
            sx={{ mb: 3, py: 1.5 }}
          >
            Continue with Google
          </Button>

          <Divider sx={{ my: 2 }}>or</Divider>

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleChange}
              variant="outlined"
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              variant="outlined"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "Login"}
            </Button>
          </Box>

          <Typography variant="body2" align="center">
            Don't have an account?{" "}
            <Link to="/register" style={{ textDecoration: 'none' }}>
              Register here
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;