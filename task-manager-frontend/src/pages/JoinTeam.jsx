import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { teamsAPI } from "../services/api";

export default function JoinTeam() {
  const { teamId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    teamsAPI.joinTeam(teamId)
      .then(() => navigate("/teams"))
      .catch(() => navigate("/"));
  }, []);

  return <div>Joining team...</div>;
}
