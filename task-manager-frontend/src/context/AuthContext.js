import React, { createContext, useState, useContext, useEffect } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // for initial load

  // ==========================================
  // FETCH USER PROFILE ONCE (IF TOKEN EXISTS)
  // ==========================================
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await authAPI.getProfile();
        setUser(response.data);
      } catch (err) {
        // Token invalid → wipe it
        localStorage.removeItem("token");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // ==========================================
  // LOGIN
  // ==========================================
  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });

    const { token, ...userData } = response.data;

    localStorage.setItem("token", token);
    setUser(userData);

    return response.data;
  };

  // ==========================================
  // REGISTER
  // ==========================================
const register = async (name, email, password) => {
  const response = await authAPI.register({ name, email, password });
  const { token, ...userData } = response.data;

  // Save token FIRST
  localStorage.setItem("token", token);

  // Force re-render BEFORE redirect
  await new Promise(resolve => {
    setUser(userData);
    setTimeout(resolve, 50);
  });

  return response.data;
};


  // ==========================================
  // LOGOUT
  // ==========================================
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading, // used to hide UI until auth state is known
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Prevent UI flicker while checking token */}
      {!loading && children}
    </AuthContext.Provider>
  );
};
