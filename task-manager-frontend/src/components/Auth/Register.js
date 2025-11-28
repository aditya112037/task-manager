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
} from "@mui/material";
import { useAuth } from "../../context/AuthContext";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match");
    }

    try {
      setError("");
      setLoading(true);
      await register(formData.name, formData.email, formData.password);
      setTimeout(() => navigate("/"), 100);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to register");
    } finally {
      setLoading(false);
    }
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
          borderRadius: 3,
          p: 1,
          boxShadow: "0px 10px 30px rgba(0, 0, 0, 0.2)",
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
            Create Account
          </Typography>

          {error && (
            <Typography
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

          <form onSubmit={handleSubmit}>
            <TextField
              label="Full Name"
              name="name"
              fullWidth
              margin="normal"
              required
              onChange={handleChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                }
              }}
            />

            <TextField
              label="Email"
              name="email"
              type="email"
              fullWidth
              margin="normal"
              required
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
              margin="normal"
              required
              onChange={handleChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                }
              }}
            />

            <TextField
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              fullWidth
              margin="normal"
              required
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
              disabled={loading}
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
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Register"
              )}
            </Button>
          </form>

          <Typography
            variant="body2"
            textAlign="center"
            mt={2}
            sx={{ color: "#666" }}
          >
            Already have an account?{" "}
            <Link
              to="/login"
              style={{ 
                textDecoration: "none", 
                color: "#667eea",
                fontWeight: 600,
              }}
            >
              Login here
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Register;