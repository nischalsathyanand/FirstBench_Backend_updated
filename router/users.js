const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Position = require("../models/position");
import session from "express-session";
import { connect } from "../src/middleware/smartAPI";

//const saltRounds = 10;

router.post("/signup", async (req, res) => {
  const { userId, password, apiKey, totpKey } = req.body;

  try {
    //const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Use the create method to simplify creating a new user instance with hashed password
    await User.create({ userId, password, apiKey, totpKey });

    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/login", connect, async (req, res) => {
  res
    .status(200)
    .json({ message: "Login successful", sessionId: req.session.id });
});
router.put("/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const updatedPosition = req.body;

    // Find positions by userId and update them
    const result = await Position.updateMany(
      { userId: userId },
      { $set: updatedPosition },
      { new: true }
    );

    res.json(result);
  } catch (error) {
    console.error("Error updating positions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
module.exports = router;
