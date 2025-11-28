import React, { createContext, useState, useContext, useEffect } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // =======================================================
  // LOAD USER IF STORED IN LOCALSTORAGE
  // (must use "user" object because api.js expects it)
  // =======================================================
  useEffect(() => {
    const saved = localStorage.getItem("user");
    if (!saved) {
      setLoading(false);
      return;
    }

    const parsed = JSON.parse(saved);

    // token exists → fetch profile for safety
    if (parsed?.token) {
      authAPI
        .getProfile()
        .then((res) => {
          setUser({ ...res.data, token: parsed.token });
        })
        .catch(() => {
          localStorage.removeItem("user");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // =======================================================
  // LOGIN
  // =======================================================
  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });

    const userObj = {
      ...res.data.user,
      token: res.data.token,
    };

    localStorage.setItem("user", JSON.stringify(userObj));
    setUser(userObj);

    return userObj;
  };

  // =======================================================
  // REGISTER
  // =======================================================
  const register = async (name, email, password) => {
    const res = await authAPI.register({ name, email, password });

    const userObj = {
      ...res.data.user,
      token: res.data.token,
    };

    localStorage.setItem("user", JSON.stringify(userObj));
    setUser(userObj);

    return userObj;
  };

  // =======================================================
  // LOGOUT
  // =======================================================
  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        register,
        logout,
        loading,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
