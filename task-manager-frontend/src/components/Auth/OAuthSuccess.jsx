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

    if (!token) {
      navigate("/login");
      return;
    }

    // Save JWT from backend
    localStorage.setItem("token", token);

    // 🎯 Fetch user immediately after receiving token
    authAPI
      .getProfile()
      .then((res) => {
        setUser(res.data);        // update global auth state
        navigate("/");            // go to dashboard
      })
      .catch(() => {
        localStorage.removeItem("token");
        navigate("/login");
      });
  }, []);

  return (
    <div style={{ textAlign: "center", paddingTop: "50px", fontSize: "20px" }}>
      Logging you in with Google...
    </div>
  );
}
