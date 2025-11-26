import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import TaskList from './components/Task/TaskList';
import OAuthSuccess from './components/Auth/OAuthSuccess';
import TeamsHome from "./pages/TeamsHome";
import TeamDetails from "./pages/TeamDetails";
import CreateTeam from "./pages/CreateTeam";
import JoinTeam from "./pages/JoinTeam";


import './App.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return user ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return !user ? children : <Navigate to="/" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } />
            <Route path="/oauth-success" element={<OAuthSuccess />} />
            <Route path="/join/:inviteCode" element={<JoinTeam />} />

             <Route
            path="/teams"
            element={
              <ProtectedRoute>
                <Layout>
                  <TeamsHome />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/teams/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateTeam />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/teams/:teamId"
            element={
              <ProtectedRoute>
                <Layout>
                  <TeamDetails />
                </Layout>
              </ProtectedRoute>
            }
          />


            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <TaskList />
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;