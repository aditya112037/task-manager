// AuthContext.jsx
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { authAPI } from "../services/api";
import {
  initSocket,
  connectSocket,
  disconnectSocket,
  getSocket,
} from "../services/socket";

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

  // Prevent double socket initialization
  const socketInitializedRef = useRef(false);

  /* ---------------------------------------------------
     SOCKET INITIALIZATION (STABLE)
  --------------------------------------------------- */
  const initializeSocket = useCallback(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    const userData = storedUser ? JSON.parse(storedUser) : null;

    if (!token || !userData?._id || socketInitializedRef.current) {
      return;
    }

    try {
      initSocket();
      connectSocket();

      socketInitializedRef.current = true;
      setSocketConnected(true);
    } catch (error) {
      console.error("Socket init failed:", error);
      socketInitializedRef.current = false;
      setSocketConnected(false);
    }
  }, []);

  /* ---------------------------------------------------
     SOCKET CLEANUP
  --------------------------------------------------- */
  const cleanupSocket = useCallback(() => {
    if (socketInitializedRef.current) {
      disconnectSocket();
      socketInitializedRef.current = false;
      setSocketConnected(false);
    }
  }, []);

  /* ---------------------------------------------------
     LOGOUT
  --------------------------------------------------- */
  const handleLogout = useCallback(() => {
    cleanupSocket();

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
    setSocketConnected(false);

    window.location.href = "/login";
  }, [cleanupSocket]);

  /* ---------------------------------------------------
     INIT SOCKET WHEN USER IS READY
  --------------------------------------------------- */
  useEffect(() => {
    if (!user || !user._id) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    initializeSocket();

    return () => {
      cleanupSocket();
    };
  }, [user, initializeSocket, cleanupSocket]);

  /* ---------------------------------------------------
     INITIAL AUTH CHECK (HYDRATE + VERIFY)
  --------------------------------------------------- */
  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      // Fast hydration
      if (token && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem("user");
        }
      }

      // Verify with backend
      if (token) {
        try {
          const res = await authAPI.getProfile();
          setUser(res.data);
          localStorage.setItem("user", JSON.stringify(res.data));
        } catch (err) {
          console.error("Auth verification failed:", err);
          handleLogout();
        }
      }

      setLoading(false);
    };

    verifyAuth();
  }, [handleLogout]);

  /* ---------------------------------------------------
     LOGIN
  --------------------------------------------------- */
  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { token, ...userData } = res.data;

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);

    return res.data;
  }, []);

  /* ---------------------------------------------------
     REGISTER
  --------------------------------------------------- */
  const register = useCallback(async (name, email, password) => {
    const res = await authAPI.register({ name, email, password });
    const { token, ...userData } = res.data;

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);

    return res.data;
  }, []);

  /* ---------------------------------------------------
     UPDATE USER
  --------------------------------------------------- */
  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  /* ---------------------------------------------------
     HELPERS
  --------------------------------------------------- */
  const isAuthenticated = useCallback(() => {
    return !!localStorage.getItem("token") && !!user;
  }, [user]);

  const checkSocketConnected = useCallback(() => {
    const socket = getSocket();
    return !!socket?.connected;
  }, []);

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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
