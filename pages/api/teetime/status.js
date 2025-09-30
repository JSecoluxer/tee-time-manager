import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const stateJSON = await redis.get('tee_time_state');
      if (!stateJSON) {
        return res.status(200).json({ message: 'No state found. Please initialize.' });
      }
      const state = JSON.parse(stateJSON);
      res.status(200).json(state);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch state from Redis.' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
