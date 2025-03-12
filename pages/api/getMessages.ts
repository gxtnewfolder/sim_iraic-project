import { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient } from 'mongodb';

const mongoUri = 'mongodb+srv://admin:1234@cluster0.zcz1n.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(mongoUri);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    await client.connect();
    const db = client.db('iot');
    const collection = db.collection('messages');
    
    // Get the latest 50 messages, sorted by timestamp in descending order
    const messages = await collection
      .find({})
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();
    
    return res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
} 