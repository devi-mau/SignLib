SignLib 🤟
SignLib is a lightweight, local web application designed to help users organize, search, and study Filipino Sign Language (FSL) videos directly from their browser.

Built with pure HTML, CSS, and JavaScript, SignLib brings your video collection into one structured interface, making it an ideal tool for students, interpreters, and the Deaf community to build their own offline-ready sign dictionary.

✨ Features
Local Hosting: Your videos stay on your machine. No internet required for playback.
Vanilla Stack: No frameworks, no node_modules, no heavy dependencies.
Easy Uploads: Add your FSL clips and store them with relevant metadata.
Smart Categorization: Organize videos by topics (e.g., Greetings, Numbers, Academic Terms).
Instant Search: Find specific signs quickly using the built-in search bar.

Focused Player: A clean interface optimized for repetitive viewing and sign study.

🚀 Getting Started
Since SignLib is built with pure web technologies, there is no complicated installation or build process!

1. Clone the repository
Bash
git clone git@github.com:devi-mau/SignLib.git
cd SignLib
2. Add your Videos
Place your .mp4 or .webm FSL videos into the /uploads folder.
3. Launch the App
Simply open index.html in your favorite web browser.

Using Python (Windows/Mac/Linux):

Bash
python -m http.server 8000
Then visit http://localhost:8000 in your browser.

🗺️ Planned Features
A-B Looping: Select a specific segment of a video to repeat indefinitely—perfect for practicing complex signs.
Mirror Mode: Flip the video horizontally so the signer’s movements match yours.
Playback Speed: Toggle between 0.25x and 0.5x speeds to catch every hand movement.
Dark Mode: A high-contrast theme for better visibility and reduced eye strain.

🛠️ Project Structure
Plaintext
SignLib/
├── index.html       # Main application entry
├── css/             # Stylesheets (Layout, Typography, Video Player)
├── js/              # Vanilla JavaScript logic (Search, Upload, UI)

🤝 Contributing
Fork the Project
Create your Feature Branch (git checkout -b feature/AmazingFeature)
Commit your Changes (git commit -m 'Add some AmazingFeature')
Push to the Branch (git push origin feature/AmazingFeature)
Open a Pull Request

📄 License
Distributed under the MIT License.
