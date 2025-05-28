Face Registration System



Overview

The Face Registration System is a web application designed to capture and store facial images along with user details for identification purposes. Users can capture a photo using their webcam, input their name, and have the data (name, date, day, and image data) stored in a MongoDB database. The frontend is built with React, leveraging react-webcam for image capture, framer-motion for animations, and react-icons for UI elements. The backend uses Node.js with Express and MongoDB for data persistence. The application features a modern, responsive UI styled with Tailwind CSS.
Features

Capture facial images via webcam with real-time preview.
Record user name, current date, and day of the week.
Store registration details in a MongoDB database.
Smooth animations for a polished user experience.
Visual feedback for image capture and successful registration.
Consent notice for storing biometric data.

Assumptions
The following assumptions were made to complete this README, as they were not explicitly specified:

Project Name: The project is named "Face Registration System."

Repository Structure: The project has separate frontend and backend directories, with server.js in the backend directory and React files in frontend/src.
Deployment Environment: The application is intended for local development and testing, with MongoDB running locally on the default port (27017).
Face Embedding: The image is stored as a base64 string in MongoDB, as the original code does not implement actual face embedding (e.g., using face-api.js).
Tailwind CSS Setup: Tailwind CSS is included via CDN, and custom classes are defined in a CSS file or inline script.
Browser Compatibility: The application is tested on modern browsers (Chrome, Firefox, Edge).
Error Handling: Basic error handling is implemented in the backend, with console logging for debugging.
License: The project uses the MIT License, a common choice for open-source projects.
Version Control: Git is used, and the repository is hosted on GitHub.

Prerequisites
Before running the application, ensure you have the following installed:

Node.js (v16 or higher)
MongoDB (running locally on mongodb://localhost:27017)
npm (Node Package Manager)
A modern web browser (e.g., Chrome, Firefox, Edge)

Installation

Clone the Repository
git clone https://github.com/your-username/face-registration-system.git
cd face-registration-system


Backend Setup

Navigate to the backend directory:cd backend


Install dependencies:npm install express mongoose cors


Ensure MongoDB is running locally on mongodb://localhost:27017.
Start the backend server:node server.js

The server will run on http://localhost:5000.


Frontend Setup

Navigate to the frontend directory:cd frontend


Install dependencies:npm install react react-dom react-webcam framer-motion react-icons


Include CDN dependencies in frontend/public/index.html:<script src="https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.production.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.production.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/framer-motion@10.12.4/dist/framer-motion.js"></script>
<script src="https://cdn.jsdelivr.net/npm/react-webcam@7.0.1/dist/react-webcam.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/react-icons@4.8.0/dist/react-icons.min.js"></script>
<script src="https://cdn.tailwindcss.com"></script>


Start the frontend development server (e.g., using Vite):npm start

The frontend will typically run on http://localhost:3000.


MongoDB Configuration

Ensure MongoDB is running locally or update the connection string in backend/server.js for a remote instance.
The application uses a database named face-recognition with a collection called registrations.



Usage

Open the application in your browser (e.g., http://localhost:3000).
Allow webcam access when prompted.
Enter a name in the input field.
Click "Capture Face" to take a photo.
Review the captured image, name, date, and day, then click "Register Face" to submit.
The application will store the data in MongoDB and display a success message.
To retake the photo, click "Retake" and repeat the process.

Project Structure
face-registration-system/
├── backend/
│   └── server.js           # Node.js/Express backend with MongoDB integration
├── frontend/
│   ├── src/
│   │   └── RegisterTab.jsx # React component for face registration UI
│   ├── public/
│   │   └── index.html      # HTML entry point with CDN dependencies
│   └── package.json        # Frontend dependencies and scripts
├── README.md               # This file
└── package.json            # Backend dependencies and scripts

Styling
The application uses Tailwind CSS via CDN. Custom classes are defined as follows (add to frontend/public/styles.css or a Tailwind config script):
.glass-card {
  @apply bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-lg;
}
.btn-primary {
  @apply bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700;
}
.btn-ghost {
  @apply text-slate-300 px-4 py-2 rounded-md hover:bg-slate-700/50;
}
.btn-secondary {
  @apply bg-slate-600 text-white px-4 py-2 rounded-md hover:bg-slate-700;
}
.glass-input {
  @apply bg-white/10 border border-white/20 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500;
}

Notes on Image Embedding

The current implementation stores the captured image as a base64 string in the imageEmbedding field in MongoDB.
For actual facial recognition, integrate a library like face-api.js or a machine learning model (e.g., FaceNet) to convert the image to a numerical embedding.
To add face embedding:
Install face-api.js in the backend:npm install face-api.js


Update the /api/register endpoint to process the base64 image and generate an embedding.
Store the embedding (e.g., a vector of numbers) in the imageEmbedding field.



Example (pseudo-code for face embedding):
const faceapi = require('face-api.js');
// Load models
await faceapi.nets.faceRecognitionNet.loadFromDisk('path/to/models');
const image = faceapi.bufferToImage(Buffer.from(imageBase64, 'base64'));
const embeddings = await faceapi.computeFaceDescriptor(image);

Troubleshooting

MongoDB Connection Issues: Ensure MongoDB is running and the connection string in server.js is correct.
Webcam Access Denied: Verify browser permissions for camera access.
CORS Errors: Confirm the backend server is running on http://localhost:5000 and CORS is enabled.
Missing Dependencies: Run npm install in both frontend and backend directories.

Contributing
Contributions are welcome! To contribute:

Fork the repository.
Create a new branch (git checkout -b feature/your-feature).
Make your changes and commit (git commit -m "Add your feature").
Push to the branch (git push origin feature/your-feature).
Open a pull request on GitHub.

This project is a part of a hackathon run by https://katomaran.com
