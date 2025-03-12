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
    const collection = db.collection('detections');
    
    // Get the latest 50 detections, sorted by timestamp in descending order
    const detections = await collection
      .find({})
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

    console.log('Detections from DB:', JSON.stringify(detections, null, 2));
    
    return res.status(200).json(detections);
  } catch (error) {
    console.error('Error fetching detections:', error);
    return res.status(500).json({ error: 'Failed to fetch detections' });
  }
} 