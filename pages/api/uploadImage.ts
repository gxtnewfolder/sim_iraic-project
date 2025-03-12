import { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient } from 'mongodb';
import { IncomingForm } from 'formidable';
import { promises as fs } from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

interface FormFields {
  location?: string;
  latitude?: string;
  longitude?: string;
  confidence?: string;
}

interface FormFiles {
  image?: {
    filepath: string;
    [key: string]: any;
  }[];
}

const mongoUri = 'mongodb+srv://admin:1234@cluster0.zcz1n.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(mongoUri);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = new IncomingForm();
    const [fields, files] = await new Promise<[FormFields, FormFiles]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields as FormFields, files as FormFiles]);
      });
    });

    // Read the uploaded image
    const file = Array.isArray(files.image) ? files.image[0] : files.image;
    if (!file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imageBuffer = await fs.readFile(file.filepath);
    const base64Image = imageBuffer.toString('base64');

    // Parse coordinates
    const latitude = parseFloat(fields.latitude || '0');
    const longitude = parseFloat(fields.longitude || '0');

    // Connect to MongoDB
    await client.connect();
    const db = client.db('iot');
    const collection = db.collection('detections');

    // Store the detection data
    await collection.insertOne({
      timestamp: new Date(),
      image: base64Image,
      location: fields.location || 'Unknown',
      coordinates: {
        latitude,
        longitude
      },
      confidence: parseFloat(fields.confidence || '1.0'),
    });

    // Publish to MQTT topic
    // const mqttMessage = {
    //   type: 'vendor_detected',
    //   timestamp: new Date(),
    //   location: fields.location || 'Unknown',
    // };

    // Clean up the temporary file
    await fs.unlink(file.filepath);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error handling image upload:', error);
    return res.status(500).json({ error: 'Failed to process image upload' });
  }
} 