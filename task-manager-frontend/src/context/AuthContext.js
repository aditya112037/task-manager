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
} from "../services/socket";
import {
  registerForPushNotifications,
  unsubscribeFromPushNotifications,
} from "../services/pushNotifications";

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);

  const socketInitializedRef = useRef(false);

  /* ---------------------------------------------------
     LOGOUT
  --------------------------------------------------- */
  const handleLogout = useCallback(() => {
    unsubscribeFromPushNotifications().catch((err) => {
      console.warn("Push unsubscribe failed:", err?.message || err);
    });

    disconnectSocket();
    socketInitializedRef.current = false;

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
    setSocketConnected(false);

    window.location.href = "/login";
  }, []);

  /* ---------------------------------------------------
     SOCKET INITIALIZATION (CRITICAL FIX)
  --------------------------------------------------- */
  useEffect(() => {
    if (!user?._id) {
      setSocketConnected(false);
      return;
    }
    if (socketInitializedRef.current) return;

    const socket = initSocket();
    if (!socket) return;

    const handleConnect = () => {
      console.log("✅ AuthContext: Socket connected");
      setSocketConnected(true);
    };

    const handleDisconnect = () => {
      console.log("⚠️ AuthContext: Socket disconnected");
      setSocketConnected(false);
    };

    const handleConnectError = (err) => {
      console.error("❌ AuthContext: Socket error:", err.message);
      setSocketConnected(false);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    socketInitializedRef.current = true;
    connectSocket();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socketInitializedRef.current = false;
    };
  }, [user?._id]);

  useEffect(() => {
    if (!user?._id) return;
    registerForPushNotifications({ askPermission: false }).catch((err) => {
      console.warn("Push registration failed:", err?.message || err);
    });
  }, [user?._id]);

  /* ---------------------------------------------------
     INITIAL AUTH CHECK
  --------------------------------------------------- */
  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (token && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem("user");
        }
      }

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

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isAuthenticated = useCallback(() => {
    return !!localStorage.getItem("token") && !!user;
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser: updateUser,
        loading,
        login,
        register,
        logout: handleLogout,
        socketConnected,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
