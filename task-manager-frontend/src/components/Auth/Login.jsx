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
          maxWidth: 380,
          borderRadius: 3,
          p: 1,
          boxShadow: "0px 10px 30px rgba(0,0,0,0.2)",
          background: "white",
        }}
      >
        <CardContent>
          <Typography
            variant="h5"
            fontWeight={700}
            textAlign="center"
            mb={2}
            color="#333"
          >
            Login to Task Manager
          </Typography>

          {/* Error Message */}
          {error && (
            <Typography
              color="error"
              sx={{
                mb: 2,
                textAlign: "center",
                fontSize: "0.9rem",
                fontWeight: 500,
                color: "#d32f2f",
              }}
            >
              {error}
            </Typography>
          )}

          {/* Google Login Button */}
          <Button
            onClick={handleGoogleLogin}
            fullWidth
            variant="outlined"
            sx={{
              py: 1.3,
              borderRadius: "10px",
              textTransform: "none",
              fontWeight: 600,
              mb: 2,
              gap: 1,
              borderColor: "#ddd",
              color: "#333",
              '&:hover': {
                borderColor: '#999',
                backgroundColor: 'rgba(0,0,0,0.04)',
              }
            }}
          >
            <img
              src="https://developers.google.com/identity/images/g-logo.png"
              alt="google"
              style={{ width: 20 }}
            />
            Continue with Google
          </Button>

          <Divider sx={{ my: 2, color: '#666' }}>or</Divider>

          {/* Email & Password Login */}
          <form onSubmit={handleSubmit}>
            <TextField
              label="Email"
              name="email"
              type="email"
              fullWidth
              required
              margin="normal"
              onChange={handleChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                }
              }}
            />

            <TextField
              label="Password"
              name="password"
              type="password"
              fullWidth
              required
              margin="normal"
              onChange={handleChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                }
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{
                mt: 2,
                py: 1.4,
                fontSize: "1rem",
                borderRadius: "10px",
                textTransform: "none",
                fontWeight: 600,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                '&:hover': {
                  background: "linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)",
                }
              }}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Login"
              )}
            </Button>
          </form>

          <Typography
            variant="body2"
            textAlign="center"
            mt={2}
            sx={{ color: "#666" }}
          >
            Don't have an account?{" "}
            <Link
              to="/register"
              style={{ 
                textDecoration: "none", 
                color: "#667eea",
                fontWeight: 600,
              }}
            >
              Register here
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;