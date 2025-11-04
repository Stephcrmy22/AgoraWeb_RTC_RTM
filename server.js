import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "agora-access-token";

const { RtcTokenBuilder, RtcRole, RtmTokenBuilder } = pkg;

dotenv.config();
const app = express();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// Serve static frontend
app.use(express.static("public"));

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;
const PORT = 5050;

app.get("/app-id", (req, res) => {
  res.json({ appId: process.env.AGORA_APP_ID });
});


app.get("/rtc-token", (req, res) => {
  const channelName = req.query.channel;
  const uid = req.query.uid || 0;
  const role = RtcRole.PUBLISHER;

  const expiration = 3600;
  const ts = Math.floor(Date.now() / 1000);
  const expire = ts + expiration;

  const token = RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    Number(uid),
    role,
    expire
  );

  res.json({ appId: APP_ID, token });
});

app.get("/rtm-token", (req, res) => {
  const account = req.query.account.toString();

  const expiration = 3600;
  const ts = Math.floor(Date.now() / 1000);
  const expire = ts + expiration;

  const token = RtmTokenBuilder.buildToken(APP_ID, APP_CERTIFICATE, account, expire);
  res.json({ token });
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
