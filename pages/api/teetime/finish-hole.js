import { Redis } from '@upstash/redis';
import { TeeTimeService } from '@/services/teeTimeService';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { groupId } = req.body;

      if (!groupId) return res.status(400).json({ error: 'groupId is required.' });

      const currentState = await redis.get('tee_time_state');

      if (!currentState) return res.status(400).json({ error: 'State not initialized.' });

      const { newState, logs } = TeeTimeService.finishHole(currentState, groupId);

      await redis.set('tee_time_state', JSON.stringify(newState));
      res.status(200).json({ message: 'Group finished hole.', state: newState, logs });
    } catch (error) {
      res.status(500).json({ error: 'Failed to process finishing hole.', details: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
