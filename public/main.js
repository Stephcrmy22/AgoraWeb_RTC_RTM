// ===============================
// 🔸 CONFIG
// ===============================
const serverUrl = "http://localhost:5050";
let appId = null; // dynamically loaded from backend

// ✅ Load App ID on page load
(async () => {
  try {
    const res = await fetch(`${serverUrl}/app-id`);
    const data = await res.json();
    appId = data.appId;
    console.log("✅ Agora App ID loaded:", appId);

    // Enable join button once appId is ready
    joinBtn.disabled = false;
  } catch (err) {
    console.error("❌ Failed to load Agora App ID:", err);
    alert("Failed to load Agora App ID from server.");
  }
})();

// ===============================
// 🔸 GLOBAL STATE
// ===============================
let client; // RTC client
let localTrack; // Local audio/video
let remoteUsers = {}; // Remote RTC users
let rtm; // RTM client
let currentChannel; // RTM channel

// ===============================
// 🔸 UI ELEMENTS
// ===============================
const joinBtn = document.getElementById("joinBtn");
const leaveBtn = document.getElementById("leaveBtn");
const sendBtn = document.getElementById("send-btn");
const chatDisplay = document.getElementById("chat-display");

// Initially disable join until appId is loaded
joinBtn.disabled = true;

// ===============================
// 🔸 EVENT LISTENERS
// ===============================
joinBtn.addEventListener("click", async () => {
  const userId = document.getElementById("userId").value;
  const channelName = document.getElementById("channelName").value;

  if (!userId || !channelName) {
    alert("Please enter both User ID and Channel Name.");
    return;
  }

  if (!appId) {
    alert("App ID is not loaded yet. Please wait a moment.");
    return;
  }

  await Promise.all([
    joinRTC(channelName, userId),
    setupRTM(channelName, userId),
  ]);
});

leaveBtn.addEventListener("click", leaveChannel);
sendBtn.addEventListener("click", sendMessage);

// ===============================
// 🔹 RTC FUNCTIONS
// ===============================
async function joinRTC(channelName, userId) {
  try {
    // 🔑 Fetch RTC token
    const res = await fetch(`${serverUrl}/rtc-token?channel=${channelName}&uid=${userId}`);
    const data = await res.json();

    // 🏗 Initialize RTC client
    client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    setupRTCListeners();

    // 🔐 Join RTC
    await client.join(appId, channelName, data.token, Number(userId));

    // 🎤🎥 Local tracks
    const [micTrack, camTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
    localTrack = { micTrack, camTrack };

    // Display local video
    const localContainer = document.getElementById("local-player");
    camTrack.play(localContainer);

    // 📡 Publish tracks
    await client.publish([micTrack, camTrack]);
    console.log("✅ RTC Publish Success");
  } catch (err) {
    console.error("❌ RTC Join Error:", err);
    alert("Failed to join RTC channel. Check console for details.");
  }
}

function setupRTCListeners() {
  // 🔹 When a remote user publishes (joins)
  client.on("user-published", async (user, mediaType) => {
    await client.subscribe(user, mediaType);
    remoteUsers[user.uid] = user;
    console.log("📡 Subscribed to", user.uid);

    if (mediaType === "video") {
      const container = document.createElement("div");
      container.id = `remote-player-${user.uid}`;
      container.className = "video-box";
      container.setAttribute("data-uid", `UID ${user.uid}`);
      document.getElementById("video-container").appendChild(container);
      user.videoTrack.play(container);
    }

    if (mediaType === "audio") {
      user.audioTrack.play();
    }

    displayMessage("INFO", `👋 User ${user.uid} joined`);
  });

  // 🔹 When a remote user unpublishes (turns off video/audio)
  client.on("user-unpublished", (user) => {
    const container = document.getElementById(`remote-player-${user.uid}`);
    container && container.remove();
    displayMessage("INFO", `📴 User ${user.uid} unpublished`);
  });

  // ✅ 🔹 When a remote user leaves (the main callback you want)
  client.on("user-left", (user) => {
    console.log("❌ User left:", user.uid);

    // Remove from tracking
    delete remoteUsers[user.uid];

    // Remove UI element
    const container = document.getElementById(`remote-player-${user.uid}`);
    if (container) container.remove();

    // Log / Display message
    displayMessage("INFO", `🚪 User ${user.uid} left the channel`);
  });

  // Optional: connection state logging
  client.on("connection-state-change", (cur, prev, reason) => {
    console.log(`🔄 Connection state changed: ${prev} -> ${cur} (${reason})`);
  });
}

async function leaveChannel() {
  // 📴 RTC leave
  if (localTrack) {
    localTrack.micTrack.close();
    localTrack.camTrack.close();
  }

  Object.values(remoteUsers).forEach(user => {
    const el = document.getElementById(`remote-player-${user.uid}`);
    el && el.remove();
  });
  remoteUsers = {};

  if (client) {
    await client.leave();
    console.log("👋 Left RTC Channel");
    displayMessage("INFO", "👋 You left the RTC channel");
  }

  // 📴 RTM leave
  if (rtm && currentChannel) {
    try {
      await rtm.unsubscribe(currentChannel);
      await rtm.logout();
      displayMessage("INFO", "👋 Left RTM Channel");
    } catch (err) {
      console.error("❌ RTM leave error:", err);
    }
  }
}

// ===============================
// 🔹 RTM FUNCTIONS
// ===============================
async function setupRTM(channelName, userId) {
  try {
    // 🔑 Fetch RTM token
    const tokenRes = await fetch(`${serverUrl}/rtm-token?account=${userId}`);
    const tokenData = await tokenRes.json();

    // 🏗 Initialize RTM client
    rtm = new AgoraRTM.RTM(appId, userId.toString());

    // 💬 RTM events
    rtm.addEventListener("message", (event) => {
      displayMessage(event.publisher, event.message);
    });

    // 🧭 Presence events: join/leave notifications in RTM
    rtm.addEventListener("presence", (event) => {
      if (event.eventType === "SNAPSHOT") {
        displayMessage("INFO", "📡 Connected to RTM channel");
      } else if (event.eventType === "JOIN") {
        displayMessage("INFO", `👋 ${event.publisher} joined RTM`);
      } else if (event.eventType === "LEAVE") {
        displayMessage("INFO", `🚪 ${event.publisher} left RTM`);
      } else {
        displayMessage("INFO", `${event.publisher} is ${event.eventType}`);
      }
    });

    rtm.addEventListener("status", (event) => {
      displayMessage("INFO", `Connection state: ${event.state} (${event.reason})`);
    });

    // 🔐 Login & Subscribe
    await rtm.login({ token: tokenData.token });
    await rtm.subscribe(channelName);
    currentChannel = channelName;

    displayMessage("INFO", `✅ Joined RTM channel: ${channelName}`);
  } catch (err) {
    console.error("❌ RTM setup error:", err);
    displayMessage("ERROR", "Failed to join RTM channel");
  }
}

// ===============================
// 🔹 SEND MESSAGE
// ===============================
async function sendMessage() {
  const input = document.getElementById("chat-input");
  const message = input.value.trim();
  const userId = document.getElementById("userId").value;

  if (!message || !currentChannel) return;

  try {
    const payload = JSON.stringify({ type: "text", message });
    const options = { channelType: "MESSAGE" };
    await rtm.publish(currentChannel, payload, options);
    displayMessage(userId, message);
    input.value = "";
  } catch (err) {
    console.error("❌ Send message failed:", err);
    displayMessage("ERROR", "Failed to send message");
  }
}

// ===============================
// 🧾 Utility
// ===============================
function displayMessage(user, msg) {
  const div = document.createElement("div");
  div.textContent = `${user}: ${msg}`;
  chatDisplay.appendChild(div);
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
}
