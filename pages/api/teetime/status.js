import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const currentState = await redis.get('tee_time_state');

      if (!currentState) {
        return res.status(200).json({ message: 'No state found. Please initialize.' });
      }

      res.status(200).json(currentState);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch state from Redis.' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
