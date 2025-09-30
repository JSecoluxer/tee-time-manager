import { Redis } from '@upstash/redis';
import { TeeTimeService, GolfGroup } from '@/services/teeTimeService';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const stateJSON = await redis.get('tee_time_state');
      if (!stateJSON) {
        return res.status(400).json({ error: 'State not initialized.' });
      }
      let currentState = JSON.parse(stateJSON);

      const { name, players } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Group name is required.' });
      }

      // Create a new group with a unique ID
      const newGroup = new GolfGroup(Date.now(), name, players);

      // Add the group to the waiting list
      let updatedState = TeeTimeService.addGroupsToWaitingList(currentState, [newGroup]);

      // Execute a scheduling attempt to see if the group can be assigned a tee time immediately
      const scheduleResult = TeeTimeService.fillEmptyTeeBoxes(updatedState);
      updatedState = scheduleResult.newState;

      await redis.set('tee_time_state', JSON.stringify(updatedState));
      res.status(200).json({ message: 'Group added and schedule updated.', state: updatedState, logs: scheduleResult.logs });
    } catch (error) {
      res.status(500).json({ error: 'Failed to add group.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
