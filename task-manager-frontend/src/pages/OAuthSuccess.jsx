import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function OAuthSuccess() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

useEffect(() => {
  const token = localStorage.getItem("token");

  // ❗ If we're on the OAuth landing page, DO NOT run the auto-profile load
  if (window.location.pathname === "/oauth-success") {
    setLoading(false);
    return;
  }

  if (!token) {
    setLoading(false);
    return;
  }

  const fetchProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      setUser(response.data);
    } catch (err) {
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  fetchProfile();
}, []);


  return (
    <div style={{ textAlign: "center", paddingTop: "50px", fontSize: "20px" }}>
      Logging you in with Google...
    </div>
  );
}
