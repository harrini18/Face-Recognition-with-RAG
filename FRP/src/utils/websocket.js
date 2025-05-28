// Simulated WebSocket connection for demo purposes
// In a real application, replace this with actual WebSocket implementation

export class WebSocketClient {
  constructor(url) {
    this.url = url;
    this.isConnected = false;
    this.callbacks = {
      message: [],
      open: [],
      close: [],
      error: []
    };
    
    console.log(`WebSocket initialized with URL: ${url}`);
  }
  
  connect() {
    console.log("Attempting to connect to WebSocket...");
    
    // Simulate connection delay
    setTimeout(() => {
      this.isConnected = true;
      this._triggerCallbacks('open');
      console.log("WebSocket connected!");
      
      // Start sending periodic messages for demo
      this._startDemoMessages();
    }, 1500);
    
    return this;
  }
  
  on(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event].push(callback);
    }
    return this;
  }
  
  send(data) {
    if (!this.isConnected) {
      console.error("Cannot send message: WebSocket not connected");
      return;
    }
    
    console.log("Sending message:", data);
    
    // Simulate response after sending
    setTimeout(() => {
      this._triggerCallbacks('message', {
        type: 'response',
        message: `Processed: ${JSON.stringify(data)}`,
        timestamp: new Date().toISOString()
      });
    }, 500);
  }
  
  close() {
    if (this.isConnected) {
      console.log("Closing WebSocket connection");
      this.isConnected = false;
      this._triggerCallbacks('close');
      clearInterval(this.demoInterval);
    }
  }
  
  _triggerCallbacks(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(callback => callback(data));
    }
  }
  
  _startDemoMessages() {
    // Send periodic mock detection data
    this.demoInterval = setInterval(() => {
      const mockData = {
        type: 'detection',
        faces: [
          {
            id: Math.floor(Math.random() * 1000),
            name: ["Emma Johnson", "Michael Chen", "Priya Patel", "James Wilson"][Math.floor(Math.random() * 4)],
            confidence: 0.85 + Math.random() * 0.14,
            bbox: {
              x: 0.2 + Math.random() * 0.5,
              y: 0.2 + Math.random() * 0.4,
              width: 0.13 + Math.random() * 0.07,
              height: 0.2 + Math.random() * 0.1
            },
            timestamp: new Date().toISOString()
          }
        ]
      };
      
      // Randomly decide how many faces to detect (0-3)
      const faceCount = Math.floor(Math.random() * 3);
      mockData.faces = mockData.faces.slice(0, faceCount);
      
      this._triggerCallbacks('message', mockData);
    }, 3000);
  }
}

export default WebSocketClient;