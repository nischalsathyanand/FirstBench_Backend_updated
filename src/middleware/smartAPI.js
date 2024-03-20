import SmartApi from "smartapi-javascript/lib/smartapi-connect";
import { authenticator } from "otplib";
import { WebSocketV2 } from "smartapi-javascript";
import axios from "axios";
const User = require("../../models/user"); // Import the User model from your schema definition

function generateTotpToken(secretKey) {
  return authenticator.generate(secretKey);
}

const MODE = {
	LTP: 1,
	Quote: 2,
	SnapQuote: 3,
	Depth: 4,
};


export async function connect(req, res, next) {
  try {
    console.log("Connecting to smart API..");

    const { userId, password } = req.body;

    // Find user in the database
    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the provided password matches the stored password
    if (password !== user.password) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // Assuming apiKey and totpKey are stored in the user object
    const { apiKey, totpKey } = user;

    // Instantiate SmartApi and generate session
    let smartApi = new SmartApi({ api_key: apiKey });
    const session_response = await smartApi.generateSession(
      userId,
      password,
      generateTotpToken(totpKey)
    );

    // Retrieve profile data
    const profileData = await smartApi.getProfile();

    // Pass user and profile data to the request object
    req.user = user;
    req.profileData = profileData;

    // Set userId in the session
    req.session.userId = user.userId;
    req.session.api_key = apiKey
    req.session.access_token = await smartApi.access_token;
    req.session.refresh_token = await smartApi.refresh_token;
    req.session.feedToken = session_response.data.feedToken;
    req.session.jwtToken = session_response.data.jwtToken;

    console.log("Connected to smart API successfully.");
    next();
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
}


export async function getPosition(req, res, next) {
  try {
    console.log("Connecting to smart API..");
    if(req.session.access_token) {
      let smart_api = new SmartApi({
        api_key: req.session.api_key,
        access_token: req.session.access_token,
        refresh_token: req.session.refresh_token
      });

      const position = await smart_api.getPosition()

      req.position = position
    }
    next();
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
}

// export async function getMarketData(req, res, next) {
//   try {
//     console.log("Connecting to smart API..For Market Data");
//     if(req.session.access_token) {
//       let smart_api = new SmartApi({
//         api_key: req.session.api_key,
//         access_token: req.session.access_token,
//         refresh_token: req.session.refresh_token
//       });

//       var params = {
//         mode: 1,
//         exchangeTokens: {
//           "NSE": [
//             "3045"
//           ]
//         }
//     };

//       const marketData = await smart_api.marketData(params)

//       req.marketData = marketData
//     }
//     next();
//   } catch (error) {
//     console.error("Error:", error);
//     res.status(500).json({ error: error.message });
//   }
// }


export async function getMarketData(req, res, next) {

    const authorization_token = "Bearer " + req.session.access_token
    const apiKey = req.session.api_key

    // const data = {
    //   mode: 'LTP',
    //   exchangeTokens: {
    //     NFO: ['96483']
    //   }
    // }

    const data = req.body

    var options = {
      method: 'POST',
      url: 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/market/v1/quote/',
      headers: {
        Accept: 'application/json',
        'X-PrivateKey': apiKey,
        'Content-Type': 'application/json',
        Authorization: authorization_token
      },
      data: data
    };
    
    axios.request(options).then(function (response) {
      console.log(response.data);
      req.resultData = response.data
      next();
    }).catch(function (error) {
      console.error(error);
      next();
    });




}

export async function connectWebsocket(req, res, next) {
  try {
    if (req.session.access_token) {

    }

    next();
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
}