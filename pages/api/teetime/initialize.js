import { Redis } from '@upstash/redis';
import { TeeTimeService } from '@/services/teeTimeService';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const initialState = TeeTimeService.initializeState();
      await redis.set('tee_time_state', JSON.stringify(initialState));
      res.status(200).json({ message: 'Tee time state initialized successfully.', state: initialState });
    } catch (error) {
      res.status(500).json({ error: 'Failed to initialize state in Redis.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
