// AuthContext.jsx
import React, { createContext, useState, useContext, useEffect, useRef } from "react";
import { authAPI } from "../services/api";
import { initSocket, connectSocket, disconnectSocket, getSocket } from "../services/socket";

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
  const [socketConnected, setSocketConnected] = useState(false);
  const socketInitializedRef = useRef(false);

  /* ---------------------------------------------------
     SOCKET MANAGEMENT
  --------------------------------------------------- */
  const initializeSocket = async () => {
    const token = localStorage.getItem("token");
    
    if (!token || socketInitializedRef.current) {
      return;
    }

    try {
      console.log("🔌 Initializing socket connection...");
      
      // Initialize socket with user ID if available
      const userId = user?._id || JSON.parse(localStorage.getItem("user"))?._id;
      initSocket(userId, token);
      
      // Connect socket
      await connectSocket(token);
      
      socketInitializedRef.current = true;
      setSocketConnected(true);
      console.log("✅ Socket initialized and connected successfully");
      
    } catch (error) {
      console.error("❌ Failed to initialize socket:", error);
      socketInitializedRef.current = false;
      setSocketConnected(false);
    }
  };

  const cleanupSocket = () => {
    if (socketInitializedRef.current) {
      console.log("🔌 Cleaning up socket connection...");
      disconnectSocket();
      socketInitializedRef.current = false;
      setSocketConnected(false);
    }
  };

  /* ---------------------------------------------------
     AUTH VERIFICATION & SOCKET INIT
  --------------------------------------------------- */
  useEffect(() => {
    const verifyAuthAndSetupSocket = async () => {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      // 1️⃣ Fast UI hydration
      if (token && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        } catch {
          localStorage.removeItem("user");
        }
      }

      // 2️⃣ Verify token with backend
      if (token) {
        try {
          const res = await authAPI.getProfile();
          const userData = res.data;
          setUser(userData);
          localStorage.setItem("user", JSON.stringify(userData));

          // 3️⃣ Initialize socket AFTER successful auth
          await initializeSocket();
          
        } catch (err) {
          console.error("Auth verification failed:", err);
          handleLogout();
        }
      }

      setLoading(false);
    };

    verifyAuthAndSetupSocket();

    // Cleanup on unmount
    return () => {
      cleanupSocket();
    };
  }, []);

  /* ---------------------------------------------------
     LOGIN
  --------------------------------------------------- */
  const login = async (email, password) => {
    try {
      const res = await authAPI.login({ email, password });
      const { token, ...userData } = res.data;

      // Store auth data
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);

      // Initialize socket after login
      await initializeSocket();

      return res.data;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  /* ---------------------------------------------------
     REGISTER
  --------------------------------------------------- */
  const register = async (name, email, password) => {
    try {
      const res = await authAPI.register({ name, email, password });
      const { token, ...userData } = res.data;

      // Store auth data
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);

      // Initialize socket after register
      await initializeSocket();

      return res.data;
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  };

  /* ---------------------------------------------------
     LOGOUT
  --------------------------------------------------- */
  const handleLogout = () => {
    // Clean up socket first
    cleanupSocket();
    
    // Clear auth data
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setSocketConnected(false);
    
    // Redirect
    window.location.href = "/login";
  };

  /* ---------------------------------------------------
     UPDATE USER PROFILE
  --------------------------------------------------- */
  const updateUser = (updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  };

  /* ---------------------------------------------------
     CHECK AUTH STATUS
  --------------------------------------------------- */
  const isAuthenticated = () => {
    return !!localStorage.getItem("token") && !!user;
  };

  const value = {
    user,
    setUser: updateUser,
    loading,
    login,
    register,
    logout: handleLogout,
    isAuthenticated,
    socketConnected,
    initializeSocket, // Export if needed elsewhere
    cleanupSocket,    // Export if needed elsewhere
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};