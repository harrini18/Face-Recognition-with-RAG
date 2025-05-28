const express = require('express');
const { MongoClient } = require('mongodb');
const { Matrix } = require('ml-matrix');

const app = express();

class InferenceClient {
  constructor(apiUrl, apiKey) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  async getRegisteredFacesCount() {
    try {
      // Mocked response for testing
      return 5; // Simulate 5 registered faces
    } catch (error) {
      throw new Error(`InferenceClient error: ${error.message}`);
    }
  }

  async getLastRegisteredPerson() {
    try {
      // Mocked response for testing
      return { name: 'John Doe', timestamp: new Date().toISOString() };
    } catch (error) {
      throw new Error(`InferenceClient error: ${error.message}`);
    }
  }

  async getPersonRegistration(name) {
    try {
      // Mocked response for testing
      return { name: name, timestamp: new Date().toISOString() };
    } catch (error) {
      throw new Error(`InferenceClient error: ${error.message}`);
    }
  }

  async registerFace(name, imageData) {
    try {
      // Mocked response for testing
      return { name: name, timestamp: new Date().toISOString(), embedding: [0.1, 0.2, 0.3] };
    } catch (error) {
      throw new Error(`InferenceClient error: ${error.message}`);
    }
  }

  async recognizeFace(imageData) {
    try {
      // Mocked response for testing
      return [
        {
          embedding: [0.1, 0.2, 0.3],
          bounding_box: {
            x: 0.3,
            y: 0.2,
            width: 0.15,
            height: 0.2,
          },
        },
      ];
    } catch (error) {
      throw new Error(`InferenceClient error: ${error.message}`);
    }
  }
}

const mongoUri = 'mongodb://localhost:27017';
const client = new MongoClient(mongoUri);
let db;

async function connectToMongo() {
  try {
    await client.connect();
    db = client.db('faceRecognition');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    db = null; // Set db to null to indicate failure
  }
}

function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  const matrixA = new Matrix([vecA]);
  const matrixB = new Matrix([vecB]);
  const dotProduct = matrixA.dot(matrixB.transpose()).get(0, 0);
  const normA = Math.sqrt(matrixA.dot(matrixA.transpose()).get(0, 0));
  const normB = Math.sqrt(matrixB.dot(matrixB.transpose()).get(0, 0));
  return dotProduct / (normA * normB);
}

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

const inferenceClient = new InferenceClient('https://your-face-recognition-api.com', 'your-api-key');

connectToMongo();

app.get('/api/recognize', (req, res) => {
  res.json({ status: 'Backend is reachable' });
});

app.post('/api/query', async (req, res) => {
  const { prompt } = req.body;

  try {
    if (prompt === 'how many registered?') {
      const count = await inferenceClient.getRegisteredFacesCount();
      if (count === null || count === undefined) {
        throw new Error('Failed to fetch registered faces count');
      }
      res.json({
        answer: count,
        timestamp: new Date().toISOString(),
      });
    } else if (prompt === 'who was the last person registered?') {
      const person = await inferenceClient.getLastRegisteredPerson();
      if (!person) {
        throw new Error('No registered persons found');
      }
      res.json({
        answer: `${person.name} was the last person registered.`,
        timestamp: new Date().toISOString(),
      });
    } else if (prompt.startsWith('when was ') && prompt.endsWith(' added?')) {
      const name = prompt.replace('when was ', '').replace(' added?', '').trim();
      const person = await inferenceClient.getPersonRegistration(name);
      if (!person) {
        throw new Error(`${name} is not a registered person`); // Fixed quotation mark
      }
      res.json({
        answer: `${person.name} was added on ${new Date(person.timestamp).toLocaleString()}.`,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.json({
        error: 'Query not recognized',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

app.post('/api/register', async (req, res) => {
  const { name, image } = req.body;

  if (!name || !image) {
    return res.status(400).json({
      error: 'Name and image are required',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const result = await inferenceClient.registerFace(name, image);
    if (!db) {
      throw new Error('Database not connected');
    }
    await db.collection('registeredFaces').insertOne({
      name: result.name,
      embedding: result.embedding,
      accepted: true,
      timestamp: result.timestamp,
    });
    res.json({
      answer: `${name} has been successfully registered.`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

app.post('/api/recognize', async (req, res) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({
      error: 'Image is required',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const faces = await inferenceClient.recognizeFace(image);
    const recognizedFaces = [];
    let registeredFaces = [];
    
    if (db) {
      try {
        registeredFaces = await db.collection('registeredFaces').find().toArray();
      } catch (error) {
        console.error('Failed to fetch registered faces:', error);
        registeredFaces = [];
      }
    }

    const threshold = 0.6;

    for (const face of faces) {
      const faceEmbedding = face.embedding || [];
      let match = null;

      for (const registered of registeredFaces) {
        const similarity = cosineSimilarity(faceEmbedding, registered.embedding);
        if (similarity > threshold) {
          match = registered;
          break;
        }
      }

      recognizedFaces.push({
        name: match ? match.name : 'Unknown',
        confidence: match ? cosineSimilarity(faceEmbedding, match.embedding) : 0,
        accepted: match ? match.accepted : false,
        bounding_box: face.bounding_box || {
          x: 0.1,
          y: 0.1,
          width: 0.2,
          height: 0.2,
        },
      });
    }

    if (db) {
      try {
        await db.collection('logs').insertOne({
          image: image,
          faces: recognizedFaces,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Failed to log recognition:', error);
      }
    }

    res.json({
      faces: recognizedFaces,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: `Failed to recognize faces: ${error.message}`,
      timestamp: new Date().toISOString(),
    });
  }
});

app.listen(5000, () => console.log('Server running on port 5000'));