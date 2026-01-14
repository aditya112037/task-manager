// AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from "react";
import { authAPI } from "../services/api";
import { initSocket, connectSocket } from "../services/socket";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socketInitialized, setSocketInitialized] = useState(false);

  /* ---------------------------------------------------
     INITIALIZE SOCKET AFTER AUTH
  --------------------------------------------------- */
  const initializeSocket = () => {
    const token = localStorage.getItem("token");
    if (token && !socketInitialized) {
      try {
        console.log("🔌 Initializing socket connection...");
        initSocket();
        connectSocket();
        setSocketInitialized(true);
        console.log("✅ Socket initialized successfully");
      } catch (error) {
        console.error("❌ Failed to initialize socket:", error);
      }
    }
  };

  /* ---------------------------------------------------
     INITIAL AUTH CHECK (HYDRATE + VERIFY)
  --------------------------------------------------- */
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      // 1️⃣ Hydrate immediately (fast UI)
      if (token && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem("user");
        }
      }

      // 2️⃣ Verify token with backend
      if (token) {
        try {
          const res = await authAPI.getProfile();
          setUser(res.data);
          localStorage.setItem("user", JSON.stringify(res.data));
          
          // 🚨 CRITICAL: Initialize socket after successful auth
          initializeSocket();
        } catch (err) {
          console.error("Auth verification failed:", err);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  /* ---------------------------------------------------
     LOGIN
  --------------------------------------------------- */
  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { token, ...userData } = res.data;

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);

    // 🚨 CRITICAL: Initialize socket after login
    initializeSocket();

    return res.data;
  };

  /* ---------------------------------------------------
     REGISTER
  --------------------------------------------------- */
  const register = async (name, email, password) => {
    const res = await authAPI.register({ name, email, password });
    const { token, ...userData } = res.data;

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);

    // 🚨 CRITICAL: Initialize socket after register
    initializeSocket();

    return res.data;
  };

  /* ---------------------------------------------------
     LOGOUT
  --------------------------------------------------- */
  const logout = () => {
    const socket = getSocket();
    if (socket) socket.disconnect();

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setSocketInitialized(false);

    window.location.href = "/login";
  };

  const value = {
    user,
    setUser,
    loading,
    login,
    register,
    logout,
    socketInitialized,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};