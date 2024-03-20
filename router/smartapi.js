const express = require("express");
const router = express.Router();
import session from "express-session";
import { connectWebsocket, getMarketData, getPosition } from "../src/middleware/smartAPI";

router.get("/getPosition", getPosition, async (req, res) => {
  res.status(200).json({ postion: req.position });
});

router.post("/getMarketData", getMarketData, async (req, res) => {
  res.status(200).json({ postion: req.resultData });
});



module.exports = router;
