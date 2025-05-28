from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from pymongo import MongoClient
from PIL import Image
import io
import cv2
import numpy as np
from datetime import datetime, date, timedelta
import logging
import psutil
import os
import gc
from scipy.spatial import distance
import mimetypes
import re
from facenet_pytorch import InceptionResnetV1, MTCNN
import torch

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/": {"origins": "*"}})  # Allow all origins for development
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading', logger=True, engineio_logger=True)

# Initialize MongoDB client
try:
    client = MongoClient('mongodb://localhost:27017/', serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    db = client['facial_recognition_db']
    collection = db['faces']
    # Create index on 'name' for faster uniqueness checks
    collection.create_index("name", unique=True)
    logger.info("MongoDB connected successfully")
except Exception as e:
    logger.error(f"MongoDB connection failed: {e}")
    exit(1)

# Initialize OpenCV DNN Face Detector
net = cv2.dnn.readNetFromCaffe(
    "deploy.prototxt",  # Path to the deploy prototxt file
    "res10_300x300_ssd_iter_140000.caffemodel"  # Path to the pre-trained model
)
net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)

# Initialize FaceNet for face embeddings
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
facenet = InceptionResnetV1(pretrained='vggface2').to(device).eval()
mtcnn = MTCNN(keep_all=False, device=device)  # For face alignment

def check_system_resources():
    """Check available system resources."""
    memory = psutil.virtual_memory()
    available_ram_gb = memory.available / (1024 ** 3)
    total_ram_gb = memory.total / (1024 ** 3)
    cpu_count = psutil.cpu_count()
    
    logger.info(f"System Resources: Total RAM: {total_ram_gb:.2f} GB, Available RAM: {available_ram_gb:.2f} GB, CPU Cores: {cpu_count}")
    
    if available_ram_gb < 1.0:
        logger.warning("Low RAM (<1.0 GB). Performance may be degraded.")
    
    return {
        'total_ram': total_ram_gb,
        'available_ram': available_ram_gb,
        'cpu_count': cpu_count
    }

def cleanup_memory():
    """Clean up memory to optimize performance."""
    gc.collect()
    logger.info("Memory cleanup performed")

def validate_image(file):
    """Validate image file type and size."""
    allowed_types = {'image/jpeg', 'image/png'}
    max_size_mb = 5  # 5MB limit
    
    # Check file type
    mime_type, _ = mimetypes.guess_type(file.filename)
    if mime_type not in allowed_types:
        return False, "Unsupported image format. Use JPEG or PNG."
    
    # Check file size
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    if file_size > max_size_mb * 1024 * 1024:
        return False, f"Image size exceeds {max_size_mb}MB limit."
    
    file.seek(0)
    return True, None

def parse_date_query(query):
    """Parse date strings from query (e.g., 'today', 'yesterday', 'this week')."""
    today = date.today()
    query = query.lower()
    
    if 'today' in query:
        return today.isoformat(), today.isoformat()
    elif 'yesterday' in query:
        yesterday = today - timedelta(days=1)
        return yesterday.isoformat(), yesterday.isoformat()
    elif 'this week' in query:
        start_of_week = today - timedelta(days=today.weekday())
        end_of_week = start_of_week + timedelta(days=6)
        return start_of_week.isoformat(), end_of_week.isoformat()
    elif 'last week' in query:
        end_of_week = today - timedelta(days=today.weekday() + 1)
        start_of_week = end_of_week - timedelta(days=6)
        return start_of_week.isoformat(), end_of_week.isoformat()
    else:
        # Try to extract specific dates (e.g., "2023-10-15")
        date_pattern = r'\b(\d{4}-\d{2}-\d{2})\b'
        dates = re.findall(date_pattern, query)
        if dates:
            return dates[0], dates[0]
        return None, None

def detect_faces(image_np):
    """Detect faces using OpenCV DNN."""
    (h, w) = image_np.shape[:2]
    blob = cv2.dnn.blobFromImage(cv2.resize(image_np, (300, 300)), 1.0, (300, 300), (104.0, 177.0, 123.0))
    net.setInput(blob)
    detections = net.forward()
    
    faces = []
    for i in range(detections.shape[2]):
        confidence = detections[0, 0, i, 2]
        if confidence > 0.5:  # Confidence threshold
            box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
            (startX, startY, endX, endY) = box.astype("int")
            # Ensure the bounding box is within the image dimensions
            startX, startY = max(0, startX), max(0, startY)
            endX, endY = min(w - 1, endX), min(h - 1, endY)
            faces.append((startY, endX, endY, startX))  # (top, right, bottom, left)
    return faces

def get_face_embedding(image_np, face_location):
    """Generate face embedding using FaceNet."""
    top, right, bottom, left = face_location
    face_image = image_np[top:bottom, left:right]
    
    # Convert to PIL Image for MTCNN alignment
    face_image = cv2.cvtColor(face_image, cv2.COLOR_RGB2BGR)
    face_pil = Image.fromarray(face_image)
    
    # Align face using MTCNN
    face_aligned = mtcnn(face_pil)
    if face_aligned is None:
        return None
    
    # Convert to tensor and generate embedding
    face_tensor = face_aligned.unsqueeze(0).to(device)
    with torch.no_grad():
        embedding = facenet(face_tensor).cpu().numpy().flatten()
    return embedding

# API Routes
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    try:
        client.admin.command('ping')
        return jsonify({"status": "ok"}), 200
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({"status": "error", "message": "MongoDB disconnected"}), 503

@app.route('/api/register', methods=['POST'])
def register_face():
    """Register a new face."""
    try:
        if 'image' not in request.files or 'name' not in request.form:
            return jsonify({'error': 'Image and name are required'}), 400
        
        file = request.files['image']
        name = request.form['name'].strip()
        
        if file.filename == '' or not name:
            return jsonify({'error': 'Invalid image or name'}), 400
        
        # Validate image
        is_valid, error_message = validate_image(file)
        if not is_valid:
            return jsonify({'error': error_message}), 400
        
        # Check for duplicate name
        if collection.find_one({"name": name}):
            return jsonify({'error': f'Name "{name}" already exists'}), 400
        
        image_stream = io.BytesIO(file.read())
        image = Image.open(image_stream)
        
        if image.mode != 'RGB':
            image = image.convert('RGB')
            
        image_np = np.array(image)
        face_locations = detect_faces(image_np)
        if len(face_locations) != 1:
            return jsonify({'error': 'Exactly one face should be detected'}), 400
        
        # Generate face embedding
        embedding = get_face_embedding(image_np, face_locations[0])
        if embedding is None:
            return jsonify({'error': 'Could not generate face embedding'}), 400
        
        embedding_list = embedding.tolist()
        timestamp = datetime.now()
        result = collection.insert_one({
            "name": name,
            "encoding": embedding_list,
            "timestamp": timestamp.isoformat(),
            "created_at": timestamp
        })
        
        socketio.emit('face_registered', {
            'message': f'Successfully registered {name}',
            'id': str(result.inserted_id),
            'name': name,
            'timestamp': timestamp.isoformat(),
            'date': timestamp.strftime('%Y-%m-%d'),
            'day': timestamp.strftime('%A')
        })
        
        cleanup_memory()
        
        return jsonify({
            'success': True,
            'message': f'Successfully registered {name}',
            'id': str(result.inserted_id),
            'timestamp': timestamp.isoformat()
        })
    except Exception as e:
        logger.error(f"Registration failed: {e}")
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@app.route('/api/register/file', methods=['POST'])
def register_face_file():
    """Register a face from an uploaded file (fallback for no webcam)."""
    try:
        if 'image' not in request.files or 'name' not in request.form:
            return jsonify({'error': 'Image and name are required'}), 400
        
        file = request.files['image']
        name = request.form['name'].strip()
        
        if file.filename == '' or not name:
            return jsonify({'error': 'Invalid image or name'}), 400
        
        # Validate image
        is_valid, error_message = validate_image(file)
        if not is_valid:
            return jsonify({'error': error_message}), 400
        
        # Check for duplicate name
        if collection.find_one({"name": name}):
            return jsonify({'error': f'Name "{name}" already exists'}), 400
        
        image_stream = io.BytesIO(file.read())
        image = Image.open(image_stream)
        
        if image.mode != 'RGB':
            image = image.convert('RGB')
            
        image_np = np.array(image)
        face_locations = detect_faces(image_np)
        if len(face_locations) != 1:
            return jsonify({'error': 'Exactly one face should be detected'}), 400
        
        # Generate face embedding
        embedding = get_face_embedding(image_np, face_locations[0])
        if embedding is None:
            return jsonify({'error': 'Could not generate face embedding'}), 400
        
        embedding_list = embedding.tolist()
        timestamp = datetime.now()
        result = collection.insert_one({
            "name": name,
            "encoding": embedding_list,
            "timestamp": timestamp.isoformat(),
            "created_at": timestamp
        })
        
        socketio.emit('face_registered', {
            'message': f'Successfully registered {name} via file upload',
            'id': str(result.inserted_id),
            'name': name,
            'timestamp': timestamp.isoformat(),
            'date': timestamp.strftime('%Y-%m-%d'),
            'day': timestamp.strftime('%A')
        })
        
        cleanup_memory()
        
        return jsonify({
            'success': True,
            'message': f'Successfully registered {name} via file upload',
            'id': str(result.inserted_id),
            'timestamp': timestamp.isoformat()
        })
    except Exception as e:
        logger.error(f"File registration failed: {e}")
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@app.route('/api/recognize', methods=['POST'])
def recognize_face():
    """Recognize faces in an image."""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'Invalid image'}), 400
        
        # Validate image
        is_valid, error_message = validate_image(file)
        if not is_valid:
            return jsonify({'error': error_message}), 400
        
        image_stream = io.BytesIO(file.read())
        image = Image.open(image_stream)
        
        if image.mode != 'RGB':
            image = image.convert('RGB')
            
        image_np = np.array(image)
        face_locations = detect_faces(image_np)
        
        if not face_locations:
            return jsonify({
                'success': True,
                'message': 'No faces detected',
                'faces': [],
                'count': 0
            })
        
        known_faces = list(collection.find(
            {"name": {"$ne": "No Faces Registered"}, "encoding": {"$exists": True, "$ne": []}},
            {'name': 1, 'encoding': 1}
        ))
        
        if not known_faces:
            return jsonify({
                'success': True,
                'message': 'No registered faces found',
                'faces': [],
                'count': 0
            })
        
        results = []
        threshold = 1.0  # FaceNet embeddings typically use a higher threshold (e.g., 1.0 for Euclidean distance)
        
        for face_location in face_locations:
            embedding = get_face_embedding(image_np, face_location)
            if embedding is None:
                continue
            
            top, right, bottom, left = face_location
            name = 'Unknown'
            confidence = 0.0
            min_distance = float('inf')
            
            for known_face in known_faces:
                try:
                    if 'encoding' not in known_face or not isinstance(known_face['encoding'], list):
                        continue
                    known_embedding = np.array(known_face['encoding'])
                    if known_embedding.shape != (512,):  # FaceNet embeddings are 512-dimensional
                        continue
                    dist = distance.euclidean(embedding, known_embedding)
                    if dist < min_distance and dist < threshold:
                        min_distance = dist
                        name = known_face['name']
                        confidence = max(0, 1.0 - (dist / threshold))
                except Exception as e:
                    logger.warning(f"Error comparing embeddings: {e}")
                    continue
            
            results.append({
                'name': name,
                'confidence': round(confidence, 2),
                'bbox': {
                    'x': left,
                    'y': top,
                    'width': right - left,
                    'height': bottom - top
                },
                'timestamp': datetime.now().isoformat()
            })
        
        socketio.emit('face_recognized', {
            'faces': results,
            'count': len(results),
            'message': f'Detected {len(results)} face(s)'
        })
        
        cleanup_memory()
        
        return jsonify({
            'success': True,
            'faces': results,
            'count': len(results),
            'message': f'Detected {len(results)} face(s)'
        })
    except Exception as e:
        logger.error(f"Recognition failed: {e}")
        return jsonify({'error': f'Recognition failed: {str(e)}'}), 500

@app.route('/api/faces', methods=['GET'])
def get_registered_faces():
    """Get all registered faces."""
    try:
        faces = list(collection.find(
            {"name": {"$ne": "No Faces Registered"}, "timestamp": {"$exists": True}},
            {"_id": 0, "encoding": 0}
        ))
        return jsonify({
            'success': True,
            'faces': faces,
            'count': len(faces)
        })
    except Exception as e:
        logger.error(f"Failed to fetch faces: {e}")
        return jsonify({'error': f'Failed to fetch faces: {str(e)}'}), 500

@app.route('/api/query', methods=['POST'])
def query_database():
    """Handle natural language queries about the face registration database."""
    try:
        data = request.get_json()
        if not data or 'query' not in data:
            return jsonify({'success': False, 'error': 'Query is required'}), 400
        
        query = data['query'].strip().lower()
        logger.info(f"Processing query: {query}")
        
        # Initialize response message
        response = ""
        
        # Fetch all faces (excluding invalid entries)
        faces = list(collection.find(
            {"name": {"$ne": "No Faces Registered"}, "timestamp": {"$exists": True}},
            {"_id": 0, "encoding": 0}
        ))
        
        if not faces:
            return jsonify({
                'success': True,
                'response': 'No faces are registered in the database.'
            })
        
        # Parse date range if applicable
        start_date, end_date = parse_date_query(query)
        
        # Handle different types of queries
        if 'count' in query or 'how many' in query:
            response = f"There are {len(faces)} registered faces in the database."
        
        elif 'list' in query or 'show' in query or 'recent' in query or 'latest' in query:
            limit = 5 if 'recent' in query or 'latest' in query else len(faces)
            sorted_faces = sorted(faces, key=lambda x: x['timestamp'], reverse=True)[:limit]
            response = "Recent registrations:\n"
            for face in sorted_faces:
                response += f"- {face['name']} (Registered on {face['timestamp'][:10]})\n"
        
        elif 'who was registered' in query and (start_date or 'today' in query or 'yesterday' in query):
            if start_date and end_date:
                filtered_faces = [
                    face for face in faces
                    if start_date <= face['timestamp'][:10] <= end_date
                ]
                if filtered_faces:
                    response = f"Registrations between {start_date} and {end_date}:\n"
                    for face in filtered_faces:
                        response += f"- {face['name']} (Registered on {face['timestamp'][:10]})\n"
                else:
                    response = f"No registrations found between {start_date} and {end_date}."
            else:
                response = "Please specify a valid date or range (e.g., 'today', 'yesterday', '2023-10-15')."
        
        elif 'find' in query or 'search' in query:
            # Extract name or partial name
            name_pattern = r'find\s+(.+?)(?:\s+registered|$|\s+on|\s+this|\s+last)'
            match = re.search(name_pattern, query)
            if match:
                name_query = match.group(1).strip()
                filtered_faces = [
                    face for face in faces
                    if name_query in face['name'].lower()
                ]
                if filtered_faces:
                    response = f"Found {len(filtered_faces)} matching registration(s):\n"
                    for face in filtered_faces:
                        response += f"- {face['name']} (Registered on {face['timestamp'][:10]})\n"
                else:
                    response = f"No registrations found for '{name_query}'."
            else:
                response = "Please specify a name to search for (e.g., 'find John')."
        
        else:
            response = "I can help with queries like:\n- How many people are registered?\n- Show recent registrations\n- Who was registered today?\n- Find users registered this week\n- Find [name]\nPlease try one of these formats."
        
        socketio.emit('query_processed', {
            'query': query,
            'response': response,
            'timestamp': datetime.now().isoformat()
        })
        
        cleanup_memory()
        
        return jsonify({
            'success': True,
            'response': response
        })
    except Exception as e:
        logger.error(f"Query processing failed: {e}")
        return jsonify({'success': False, 'error': f'Query processing failed: {str(e)}'}), 500

@socketio.on('connect')
def handle_connect():
    logger.info('Client connected via WebSocket')
    emit('connected', {'message': 'Connected to server'})

@socketio.on('disconnect')
def handle_disconnect():
    logger.info('Client disconnected from WebSocket')

@socketio.on('ping')
def handle_ping():
    emit('pong', {'timestamp': datetime.now().isoformat()})

if __name__ == '__main__':
    logger.info("Starting Flask application...")
    check_system_resources()
    logger.info("Starting server on http://0.0.0.0:5000")
    socketio.run(app, debug=False, host='0.0.0.0', port=5000)