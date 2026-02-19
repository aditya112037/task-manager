import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

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

    const handleOAuthSuccess = async () => {
      try {
        // Save token
        localStorage.setItem("token", token);
        
        // Fetch user profile
        const response = await authAPI.getProfile();
        const userData = response.data;
        
        // Store complete user info with token
        localStorage.setItem("user", JSON.stringify({
          token: token,
          ...userData
        }));
        
        // Update auth context
        setUser(userData);
        
        // Redirect to dashboard
        navigate("/app");
      } catch (error) {
        console.error("OAuth failed:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }
    };

    handleOAuthSuccess();
  }, [navigate, setUser]);

  return (
    <div style={{ textAlign: "center", paddingTop: "50px", fontSize: "20px" }}>
      Logging you in with Google...
    </div>
  );
}
