import React, { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Box
} from "@mui/material";
import { teamsAPI } from "../services/api";

export default function CreateTeamDialog({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    icon: "👥",
    color: "#1976d2",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    await teamsAPI.createTeam(form);
    onCreated();
    onClose();
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Create Team</DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

          <TextField
            label="Team Name"
            name="name"
            fullWidth
            required
            value={form.name}
            onChange={handleChange}
          />

          <TextField
            multiline
            rows={3}
            label="Description"
            name="description"
            fullWidth
            value={form.description}
            onChange={handleChange}
          />

          {/* ICON PICKER */}
          <TextField
            label="Emoji Icon"
            name="icon"
            fullWidth
            value={form.icon}
            onChange={handleChange}
          />

          {/* COLOR PICK */}
          <TextField
            label="Theme Color"
            name="color"
            type="color"
            fullWidth
            value={form.color}
            onChange={handleChange}
          />

        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
