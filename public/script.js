console.log("Hello from script.js");

const video = document.getElementById('video');

// Initializing variables to track the switch states
let isFeelingDetectionOn = true;
let isFaceMappingOn = true;

Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/models')
]).then(startVideo);

function startVideo() {
    // navigator.mediaDevices.getUserMedia({ video: true })
    navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: { exact: "environment" }
        }
    })
        .then(stream => {
            video.srcObject = stream;
        })
        .catch(err => console.error("Error accessing camera:", err));
}

// Speech Recognition Setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;
let spokenText = '';

recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript + ' ';
    }
    spokenText = transcript.trim(); // Update text overlay
};

recognition.start();

video.addEventListener('loadedmetadata', () => {
    console.log("Video metadata loaded, ready to play.");
});

let previousPositions = [];

video.addEventListener('play', async () => {
    console.log("Video is playing, starting face detection...");

    if (!video.readyState >= 2) {
        console.error("Video is not ready yet.");
        return;
    }

    const canvas = faceapi.createCanvasFromMedia(video);
    document.body.append(canvas);
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    const detectFaces = async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceExpressions();
        const resizedDetections = faceapi.resizeResults(detections, displaySize);

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (isFaceMappingOn) {
            faceapi.draw.drawDetections(canvas, resizedDetections);
            faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
            faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
        }

        resizedDetections.forEach(detection => {
            const { x, y, width, height } = detection.detection.box;
            const ctx = canvas.getContext('2d');

            // Get the dominant emotion
            const expressions = detection.expressions;
            const dominantEmotion = Object.keys(expressions).reduce((a, b) => expressions[a] > expressions[b] ? a : b);

            // Map dominant emotion to text color only if feeling detection is on
            let textColor = "white"; // default color
            if (isFeelingDetectionOn) {
                switch (dominantEmotion) {
                    case 'happy':
                        textColor = "yellow";
                        break;
                    case 'sad':
                        textColor = "blue";
                        break;
                    case 'angry':
                        textColor = "red";
                        break;
                    case 'fearful':
                        textColor = "purple";
                        break;
                    case 'disgusted':
                        textColor = "green";
                        break;
                    case 'surprised':
                        textColor = "orange";
                        break;
                    case 'neutral':
                    default:
                        textColor = "white";
                        break;
                }
            }

            // Calculate the new position for the text
            const newX = x + width / 2;
            const newY = y - 20; // Fixed offset above the face

            // Store the previous positions to smooth the movement
            previousPositions.push({ x: newX, y: newY });

            // Keep the last 5 positions (you can adjust the number for more/less smoothing)
            if (previousPositions.length > 5) {
                previousPositions.shift(); // Remove the oldest position to keep the list size fixed
            }

            // Calculate the average position to smooth out the jitter
            const averagePosition = previousPositions.reduce((avg, pos) => {
                avg.x += pos.x;
                avg.y += pos.y;
                return avg;
            }, { x: 0, y: 0 });

            const smoothedX = averagePosition.x / previousPositions.length;
            const smoothedY = averagePosition.y / previousPositions.length;

            // Use a more modern sans-serif font
            ctx.font = "24px 'Avenir', sans-serif"; // Ensure Avenir is available or fallback to sans-serif
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            // Set outline (stroke) properties
            ctx.lineWidth = 6;
            ctx.strokeStyle = "black";
            ctx.lineJoin = "round";
            ctx.lineCap = "round";

            // Draw the outline first to prevent text overlap issues
            ctx.strokeText(spokenText, smoothedX, smoothedY);

            // Set fill (text color) properties based on emotion
            ctx.fillStyle = textColor;

            // Fill the text with the selected color
            ctx.fillText(spokenText, smoothedX, smoothedY);
        });

        // Continue detecting faces
        if (!video.paused && !video.ended) {
            requestAnimationFrame(detectFaces);
        }
    };

    // Start face detection with animation frame
    requestAnimationFrame(detectFaces);
});

// Add event listeners to the switches
document.getElementById("feelingSwitch").addEventListener("change", function() {
    isFeelingDetectionOn = this.checked;
    console.log(`Feeling Detection is ${isFeelingDetectionOn ? "ON" : "OFF"}`);
});

document.getElementById("faceMappingSwitch").addEventListener("change", function() {
    isFaceMappingOn = this.checked;
    console.log(`Face Mapping is ${isFaceMappingOn ? "ON" : "OFF"}`);
});

