COME JOIN US IN OUR [DISCORD COMMUNITY](https://discord.com/invite/uhkxjDpJsN)
🛠️ Installation & Setup

Follow these steps to run the project locally:

1️⃣ Clone this repository
git clone <your-repo-url>
cd <your-project-folder>

2️⃣ Install dependencies
npm install

3️⃣ Start the backend server
node server.js


(Skip this if your project doesn’t include a server.)

4️⃣ Run the frontend (Vite)
npm run dev


Then open the local URL shown in your terminal — usually:

http://localhost:5173

📂 Project Structure
├── src/
│   ├── components/
│   │   └── VideoCalling.jsx     # Main Agora video UI
│   ├── main.jsx                 # React entry point
│   └── ...
├── server.js                    # Optional Node.js backend
├── .env                         # Your Agora credentials (ignored by Git)
├── .gitignore
├── package.json
└── README.md

🧠 Notes

The user-left event triggers instantly when a Flutter user disconnects because the Agora server detects the lost connection faster (via UDP teardown).

You can manually enter the UID when joining a channel, or leave it blank for a random one.

💬 Support

If you encounter issues, check:

Agora Docs: https://docs.agora.io

Web SDK API Reference: https://api-ref.agora.io/en/video-sdk/web/

File an issue in this repo
