import React from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";

const TeamCard = ({ team }) => {
  const navigate = useNavigate();

  return (
    <Card
      role="button"
      tabIndex={0}
      sx={{
        borderRadius: 3,
        cursor: "pointer",
        touchAction: "manipulation",
        transition: "box-shadow 0.2s ease, transform 0.18s ease",
        "&:hover": { boxShadow: "0 6px 20px rgba(0,0,0,0.15)" },
        "&:active": { transform: "translateY(-1px)" },
      }}
      onClick={() => navigate(`/teams/${team._id}`)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigate(`/teams/${team._id}`);
        }
      }}
    >
      <CardContent>
        <Typography variant="h6" fontWeight={700}>
          {team.name}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {team.description}
        </Typography>

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption">
            Members: {team.members?.length}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TeamCard;
