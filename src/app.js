import cors from "cors";
import NodeCache from "node-cache";
import cron from "node-cron";
import fs from "fs";
import session, { MemoryStore } from "express-session";
const express = require("express");
const sessionStore = new MemoryStore();

const path = require("path");

const mongoose = require("mongoose");

//const saltRounds = 10;
const app = express();

const corsOptions = {
  origin: "http://localhost:1234",
  credentials: true,
};
app.use(express.static(path.join(__dirname, "public")));

app.use(cors(corsOptions));

// // For websocket

// const http = require("http").createServer(app);
// const io = require("socket.io")(http, {
//   cors: {
//     origin: "http://localhost:1234",
//     methods: ["GET", "POST"]
//   }
// });

// io.use((socket, next) => {
//   // Adding CORS headers for WebSocket handshake
//   socket.handshake.headers.origin = socket.request.headers.origin;
//   next();
// });

app.use(
  session({
    secret: "this-secret-has-to-be-changed-when-used-in-production",
    saveUninitialized: false,
    resave: false,
    store: sessionStore,
    // set below cookie if you want to expire user session in one our and invalidate cookie.
    /*cookie: {
    maxAge: 60000 * 60,
  },*/
  })
);
app.use(express.json());
// mongodb connections
mongoose.connect("mongodb://localhost:27017/firstbench", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function () {
  console.log("Connected to MongoDB");
});

const port = process.env.PORT || 3000;

// Initialize NodeCache
const cache = new NodeCache();

// Flag to indicate whether to fetch data from the remote server
const fetchFromRemote = true;

// Function to fetch and cache data from the remote server
// Function to fetch and cache data
async function fetchDataFromRemoteAndCache() {
  try {
    console.log("Please wait loading angle broking data to cache app start.");
    const response = await fetch(
      "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json"
    );
    if (!response.ok) {
      throw new Error("Failed to fetch data");
    }

    const reader = response.body.getReader();
    const contentLength = parseInt(response.headers.get("Content-Length"), 10);
    let receivedLength = 0;
    let chunks = [];

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      chunks.push(value);
      receivedLength += value.length;
      const progress = Math.round((receivedLength / contentLength) * 100);
      process.stdout.write(`\rProgress: ${progress}%`);
    }

    const buffer = new Uint8Array(receivedLength);
    let offset = 0;

    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }

    const data = JSON.parse(new TextDecoder("utf-8").decode(buffer));

    // Set data in cache after entire response is received
    cache.set("scripts", data);
    console.log("\nData loaded into cache on app start.");
  } catch (error) {
    console.error(
      "Error fetching and caching script details on app start:",
      error
    );
  }
}

const getSessionData = (sessionId) => {
  return new Promise((resolve, reject) => {
    sessionStore.get(sessionId, (error, sessionData) => {
      if (error) {
        reject(error);
      } else {
        resolve(sessionData);
      }
    });
  });
};

// Function to start the app
async function startApp() {
  try {
    if (fetchFromRemote) {
      await fetchDataFromRemoteAndCache(); // Fetch and cache data from remote server on app start
    } else {
      // Read data from local file and set it in cache
      const rawData = fs.readFileSync("./data/OpenAPIScripMaster.json");
      const data = JSON.parse(rawData);
      cache.set("scripts", data);
      console.log("Data loaded from local file into cache on app start..");
    }

    // io.on("connection", (socket) => {
    //   console.log("A user connected!");

    //   // Handle incoming messages from the client
    //   socket.on("private_message", (message) => {
    //     console.log("Received message:", message);
    //     if (message.sessionId) {
    //       getSessionData(message.sessionId)
    //         .then((sessionData) => {

    //           let web_socket = new WebSocketV2({
    //             jwttoken: sessionData.jwtToken,
    //             apikey: sessionData.api_key,
    //             clientcode: sessionData.userId,
    //             feedtype: sessionData.feedToken,
    //           });

    //           web_socket.connect().then((res) => {
    //             let json_req = {
    //               correlationID: "abcde12345",
    //               action: 1,
    //               mode: 1,
    //               exchangeType: 2,
    //               tokens: message.message,
    //               params: {
    //                 mode: 1,
    //                 tokenList: [
    //                   {
    //                     exchangeType: 1,
    //                     tokens: ["141785"],
    //                   },
    //                 ],
    //               },
    //             };

    //             console.log(json_req)

    //             web_socket.fetchData(json_req);
    //             web_socket.on("tick", receiveTick);

    //             function receiveTick(data) {
    //               console.log("Checking for tokens " + message.message)

    //               console.log("receiveTick:::::", data);
    //               socket.emit("server_message", data);
    //             }
    //           });

    //         })
    //         .catch((error) => {
    //           console.error("Error retrieving session data:", error);
    //         });
    //     }
    //     // Send data back to the client (optional)

    //   });

    //   // Handle socket disconnection
    //   socket.on("disconnect", () => {
    //     console.log("A user disconnected!");
    //   });
    // });

    // http.listen(3000)

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("Error starting the app:", error);
  }
}

// Routes

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/v1/getscripts", async (req, res) => {
  try {
    const rawData = fs.readFileSync("./data/scriptData.json");
    const data = JSON.parse(rawData);
    res.json(data);
  } catch (error) {
    console.error("Error fetching script details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Routes
app.get("/api/v1/getscriptbyname", async (req, res) => {
  try {
    const name = req.query.name;
    if (!name) {
      return res.status(400).json({ error: "Name parameter is required" });
    }

    const cachedData = cache.get("scripts");
    if (!cachedData) {
      return res.status(404).json({
        error: "Data not available in cache. Please try again later.",
      });
    }

    //const script = cachedData.find(item => item.name === name);
    const script = cachedData.filter(
      (record) => record.name === name && record.exch_seg === "NFO"
    );
    if (!script) {
      return res.status(404).json({ error: "Script not found" });
    }

    res.json(script);
  } catch (error) {
    console.error("Error fetching script details by name:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to get NFO symbols
app.get("/api/v1/getnfosymbols", async (req, res) => {
  try {
    const cachedData = cache.get("scripts");

    if (cachedData) {
      const nseSymbols = cachedData
        .filter((item) => item.exch_seg === "NFO")
        .map((item) => item.symbol);
      res.json(nseSymbols);
    } else {
      res
        .status(404)
        .json({ error: "Data not available. Please try again later." });
    }
  } catch (error) {
    console.error("Error fetching NSE symbols:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to get paginated details
app.get("/api/v1/getdetails", async (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;
  const startIndex = (page - 1) * pageSize;
  const endIndex = page * pageSize;

  try {
    const cachedData = cache.get("scripts");

    if (cachedData) {
      console.log("Getting from cache");
      const paginatedData = cachedData.slice(startIndex, endIndex);
      res.json({ data: paginatedData, page, pageSize });
    } else {
      console.log("Getting from webserver");
      res
        .status(404)
        .json({ error: "Data not available. Please try again later." });
    }
  } catch (error) {
    console.error("Error fetching script details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Schedule cache refresh every 1 hours
cron.schedule("0 */1 * * *", async () => {
  console.log("Refreshing cache...");
  try {
    if (fetchFromRemote) {
      await fetchDataFromRemoteAndCache();
    } else {
      // Read data from local file and set it in cache
      const rawData = fs.readFileSync("./data/OpenAPIScripMaster.json");
      const data = JSON.parse(rawData);
      cache.set("scripts", data);
      console.log("Data loaded from local file into cache on cache refresh.");
    }
  } catch (error) {
    console.error("Error refreshing cache:", error);
  }
});

// add user router
let users = require("../router/users");
app.use("/users", users);

// add smartApi router
let smartapi = require("../router/smartapi");
app.use("/smartapi", smartapi);

startApp();
