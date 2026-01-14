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
     🚨 CRITICAL: SOCKET AUTH INITIALIZATION
     Backend depends on socket.user = { _id, token }
  --------------------------------------------------- */
  const initializeSocket = async () => {
    const token = localStorage.getItem("token");
    const userData = user || JSON.parse(localStorage.getItem("user") || "null");
    
    if (!token || !userData?._id || socketInitializedRef.current) {
      console.log("⚠️ Cannot initialize socket - missing token, user ID, or already initialized");
      return;
    }

    try {
      console.log("🔌 Initializing socket with user auth...", { userId: userData._id });
      
      // 🚨 CRITICAL: Initialize socket with BOTH userId AND token
      // This sets socket.user on the server side
      initSocket(userData._id, token);
      
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

  /* ---------------------------------------------------
     🚨 CRITICAL: SOCKET CLEANUP
  --------------------------------------------------- */
  const cleanupSocket = () => {
    if (socketInitializedRef.current) {
      console.log("🔌 Cleaning up socket connection...");
      disconnectSocket();
      socketInitializedRef.current = false;
      setSocketConnected(false);
    }
  };

  /* ---------------------------------------------------
     🚨 CRITICAL: RE-INITIALIZE SOCKET WHEN USER CHANGES
     This ensures socket.user is always set when user is logged in
  --------------------------------------------------- */
  useEffect(() => {
    if (!user || !user._id) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }

    // Initialize socket when user data is available
    initializeSocket();

    // Cleanup on unmount or when user changes
    return () => {
      cleanupSocket();
    };
  }, [user]); // Re-run when user changes

  /* ---------------------------------------------------
     INITIAL AUTH CHECK (HYDRATE + VERIFY)
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

          // 🚨 SOCKET WILL BE INITIALIZED BY THE DEPENDENCY EFFECT ABOVE
          // When setUser completes, the useEffect above will trigger
          
        } catch (err) {
          console.error("Auth verification failed:", err);
          handleLogout();
        }
      }

      setLoading(false);
    };

    verifyAuthAndSetupSocket();
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
      setUser(userData); // 🚨 This triggers socket initialization via useEffect

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
      setUser(userData); // 🚨 This triggers socket initialization via useEffect

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

  /* ---------------------------------------------------
     CHECK SOCKET STATUS
  --------------------------------------------------- */
  const checkSocketConnected = () => {
    const socket = getSocket();
    return socket && socket.connected;
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
    checkSocketConnected,
    initializeSocket,
    cleanupSocket,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};