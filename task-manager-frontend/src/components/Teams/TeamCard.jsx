import React from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";

const TeamCard = ({ team }) => {
  const navigate = useNavigate();

  return (
    <Card
      onClick={() => navigate(`/teams/${team._id}`)}
      sx={{
        cursor: "pointer",
        borderRadius: 3,
        p: 1,
        boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
        transition: "0.2s",
        "&:hover": { boxShadow: "0 6px 20px rgba(0,0,0,0.15)" },
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: team.color || "#1976d2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              color: "white",
              mr: 2,
            }}
          >
            {team.icon || "👥"}
          </Box>

          <Typography variant="h6" fontWeight={700}>
            {team.name}
          </Typography>
        </Box>

        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
          {team.description || "No description"}
        </Typography>

        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          Members: {team.members?.length || 1}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default TeamCard;
