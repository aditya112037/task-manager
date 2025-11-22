import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function OAuthSuccess() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("token", token);

      // 🔥 Immediately fetch user (fixes staying on login page)
      authAPI.getProfile()
        .then(res => {
          setUser(res.data);
          navigate("/");
        })
        .catch(() => {
          navigate("/login");
        });
    }
  }, []);

  return <div>Logging you in...</div>;
}
