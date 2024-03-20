let mongoose = require("mongoose");
let userSchema = mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  apiKey: {
    type: String,
    required: true,
  },
  totpKey: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("User", userSchema);
