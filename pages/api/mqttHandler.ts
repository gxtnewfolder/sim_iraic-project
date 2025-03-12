import { NextApiRequest, NextApiResponse } from 'next';
import mqtt from 'mqtt';
import { MongoClient } from 'mongodb';

// MongoDB Client Setup
const mongoUri = 'mongodb+srv://admin:1234@cluster0.zcz1n.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(mongoUri);
let dbReady = false;  // Flag to check MongoDB connection

async function connectMongo() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    dbReady = true;
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
  }
}

connectMongo();

// MQTT Client Setup with SSL
const mqttOptions = {
  username: 'gxtnewfolder',
  password: 'P@ssword1234',
  port: 8883,
  protocol: 'mqtts' as const,
};

const mqttClient = mqtt.connect('mqtts://dcbf71dfb0dc4457b4658c1a0bf8e6d2.s1.eu.hivemq.cloud', mqttOptions);

mqttClient.on('error', (err) => {
  console.error('Failed to connect to MQTT broker', err);
});

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');

  // Subscribe and confirm success
  mqttClient.subscribe('test/topic', (err) => {
    if (err) {
      console.error('Failed to subscribe to topic:', err);
    } else {
      console.log('Successfully subscribed to topic: test/topic');
    }
  });
});

// Listen for incoming MQTT messages
mqttClient.on('message', async (topic: string, message: Buffer) => {
  console.log(`Received message on topic ${topic}: ${message.toString()}`);

  // Ensure MongoDB is ready before inserting
  if (!dbReady) {
    console.error('MongoDB is not connected yet. Dropping message.');
    return;
  }

  try {
    const db = client.db('iot');
    const collection = db.collection('messages');
    
    await collection.insertOne({
      topic,
      message: message.toString(),
      timestamp: new Date(),
    });

    console.log('Message stored in MongoDB successfully');
  } catch (err) {
    console.error('Error inserting message into MongoDB:', err);
  }
});

// API Endpoint to Publish MQTT Messages
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { topic, message } = req.body;

    if (!topic || !message) {
      return res.status(400).json({ error: 'Topic and message are required' });
    }

    mqttClient.publish(topic, message, {}, (err) => {
      if (err) {
        console.error('Error publishing MQTT message:', err);
        return res.status(500).json({ success: false, error: 'Failed to publish message' });
      }
      console.log(`Message published to ${topic}`);
      return res.status(200).json({ success: true });
    });
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
