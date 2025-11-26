import React, { useEffect, useState } from "react";
import { Box, Typography, Button, Grid, Card, CardContent } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { teamsAPI } from "../services/api";
import CreateTeamDialog from "./CreateTeamDialog";

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const res = await teamsAPI.getMyTeams();
      setTeams(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>My Teams</Typography>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ borderRadius: 2 }}
        >
          Create Team
        </Button>
      </Box>

      {/* TEAMS GRID */}
      <Grid container spacing={2}>
        {teams.map((team) => (
          <Grid item xs={12} sm={6} md={4} key={team._id}>
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                cursor: "pointer",
                transition: "0.2s",
                "&:hover": { boxShadow: "0 6px 16px rgba(0,0,0,0.12)" }
              }}
            >
              <CardContent>
                <Typography fontSize={32}>{team.icon}</Typography>
                <Typography variant="h6" fontWeight={600}>
                  {team.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {team.description || "No description"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* DIALOG */}
      {openDialog && (
        <CreateTeamDialog
          onClose={() => setOpenDialog(false)}
          onCreated={fetchTeams}
        />
      )}
    </Box>
  );
}
