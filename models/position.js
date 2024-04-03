const mongoose = require("mongoose");

const buySchema = new mongoose.Schema({
  script: String,
  sprice: Number,
  cepe: String,
  bs: String,
  expdate: Date,
  price: Number,
  lots: Number,
  lotsize: Number,
  symbol_token: String,
  investment: Number,
  profitdata: Number,
});

const positionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  buys: [buySchema],
});

const Position = mongoose.model("Position", positionSchema);

module.exports = Position;
