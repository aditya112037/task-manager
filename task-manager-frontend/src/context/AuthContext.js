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
import { initSocket, getSocket } from "../services/socket";

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
     LOGOUT (ONLY PLACE SOCKET SHOULD BE DISCONNECTED)
  --------------------------------------------------- */
  const handleLogout = useCallback(() => {
    // ✅ Disconnect socket only if it was initialized
    if (socketInitializedRef.current) {
      const socket = getSocket();
      socket?.disconnect();
      socketInitializedRef.current = false;
    }

    // Clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Reset state
    setUser(null);
    setSocketConnected(false);

    // Redirect to login
    window.location.href = "/login";
  }, []);

  /* ---------------------------------------------------
     SOCKET INITIALIZATION (RUNS ONCE WHEN USER IS READY)
  --------------------------------------------------- */
  useEffect(() => {
    if (!user?._id) return;
    if (socketInitializedRef.current) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    // Initialize socket
    const socket = initSocket();
    if (!socket) return;

    socketInitializedRef.current = true;

    // Set up connection listeners
    socket.on("connect", () => {
      console.log("✅ AuthContext: Socket connected");
      setSocketConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("⚠️ AuthContext: Socket disconnected");
      setSocketConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("❌ AuthContext: Socket error:", err.message);
      setSocketConnected(false);
    });

  }, [user]);

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
     HELPER
  --------------------------------------------------- */
  const isAuthenticated = useCallback(() => {
    return !!localStorage.getItem("token") && !!user;
  }, [user]);

  /* ---------------------------------------------------
     CONTEXT VALUE
  --------------------------------------------------- */
  const value = {
    user,
    setUser: updateUser,
    loading,
    login,
    register,
    logout: handleLogout,
    socketConnected,
    isAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};