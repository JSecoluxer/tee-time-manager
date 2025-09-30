// services/teeTimeService.js

export class GolfGroup {
  constructor(id, name, players = 4) {
    this.id = id;
    this.name = name;
    this.players = players;
    this.currentHole = null;
    this.status = 'WAITING';
  }
}

/**
 * Stateless Tee Time Service Logic
 * All functions receive the current state and return the updated new state.
 */
export const TeeTimeService = {
  /**
   * Initializes the system state
   * @param {number} totalHoles
   * @param {number} maxGroupsPerTeeBox
   */
  initializeState(totalHoles = 18, maxGroupsPerTeeBox = 3) {
    const teeBoxes = {};

    // Default starting tee box is Hole 1
    if (totalHoles >= 1) {
      teeBoxes[1] = [];
    }

    // If total holes is 10 or more, set Hole 10 as a starting tee box
    if (totalHoles >= 10) {
      teeBoxes[10] = [];
    }

    // If total holes is 19 or more (e.g., 27-hole course), set Hole 19 as a starting tee box
    if (totalHoles >= 19) {
      teeBoxes[19] = [];
    }

    // Note: You can add other starting tee boxes here, for example, if totalHoles=36, Hole 28 might be included

    // Initialize the transition queue
    const transitioningGroups = {};

    // Include all defined teeBoxes in transitioningGroups to receive transferring groups
    Object.keys(teeBoxes).forEach(hole => {
      transitioningGroups[hole] = [];
    });

    return {
      totalHoles,
      maxGroupsPerTeeBox,
      waitingList: [],
      teeBoxes,
      groupsOnCourse: {}, // Use object for fast lookup: { [groupId]: group }
      transitioningGroups, // { '10': [group1], '19': [group2] }
    };
  },

  /**
   * Adds groups to the waiting list
   */
  addGroupsToWaitingList(state, groups) {
    const newState = { ...state };
    newState.waitingList.push(...groups);
    return newState;
  },

  /**
   * Core scheduling algorithm
   * @returns {{newState: object, logs: string[]}}
   */
  fillEmptyTeeBoxes(state) {
    const newState = JSON.parse(JSON.stringify(state)); // Deep copy to avoid mutation
    const { waitingList, teeBoxes, maxGroupsPerTeeBox, transitioningGroups } = newState;
    const logs = [];

    const teeBoxHoles = Object.keys(teeBoxes).map(Number).sort((a, b) => a - b);

    for (const hole of teeBoxHoles) {
      const teeBox = teeBoxes[hole];

      while (teeBox.length < maxGroupsPerTeeBox) {
        let movedGroup = null;

        // [Priority 1: On-course transitioning groups]
        if (transitioningGroups[hole] && transitioningGroups[hole].length > 0) {
          movedGroup = transitioningGroups[hole].shift();
          movedGroup.currentHole = hole;
          teeBox.push(movedGroup);
          logs.push(`[Priority Transition] Group ${movedGroup.name} (from Hole ${hole - 1}) enters Tee Box ${hole}.`);
        }
        // [Priority 2: Groups from the waiting list]
        else if (waitingList.length > 0) {
          movedGroup = waitingList.shift();
          movedGroup.currentHole = hole;
          movedGroup.status = 'PLAYING';
          movedGroup.holesCompleted = 0;
          movedGroup.startHole = hole;
          teeBox.push(movedGroup);
          logs.push(`[New Tee Off] Group ${movedGroup.name} enters Tee Box ${hole} from the waiting list.`);
        } else {
          break; // No more groups to schedule
        }
      }
    }
    return { newState, logs };
  },

  /**
   * Tees off a group from the tee box and moves them onto the course
   * @returns {{newState: object, logs: string[]}}
   */
  teeOffGroup(state, groupId) {
    const newState = JSON.parse(JSON.stringify(state));
    const { teeBoxes, groupsOnCourse } = newState;
    const logs = [];
    let groupToTeeOff = null;

    // Find the group to tee off (must be the first in the tee box queue)
    for (const hole in teeBoxes) {
      if (teeBoxes[hole].length > 0 && teeBoxes[hole][0].id === groupId) {
        groupToTeeOff = teeBoxes[hole].shift();
        logs.push(`[Tee Off] Group ${groupToTeeOff.name} starts playing from Tee Box ${hole}.`);
        break;
      }
    }

    if (!groupToTeeOff) {
      logs.push(`[Tee Off Blocked] Group with ID ${groupId} is not at the front of any tee box.`);
      return { newState: state, logs };
    }

    // Add the group to the on-course tracking list
    groupsOnCourse[groupToTeeOff.id] = groupToTeeOff;

    // A vacancy appeared on the tee box after tee off, execute a schedule check immediately
    const schedulingResult = this.fillEmptyTeeBoxes(newState);

    return {
      newState: schedulingResult.newState,
      logs: [...logs, ...schedulingResult.logs]
    };
  },

  /**
   * Simulates an on-course group finishing a hole
   * @returns {{newState: object, logs: string[]}}
   */
  finishHole(state, groupId) {
    const newState = JSON.parse(JSON.stringify(state));
    const { groupsOnCourse, totalHoles, teeBoxes, transitioningGroups } = newState;
    const logs = [];

    const group = groupsOnCourse[groupId];

    if (!group) {
      logs.push(`[Move Error] Group with ID ${groupId} not found on the course.`);
      return { newState: state, logs };
    }

    // Increment the number of holes completed after finishing the current hole (assume +1 per hole)
    group.holesCompleted += 1;

    const ROUND_GOAL = 18;

    // 1. Check if the group has reached 18 holes (Finish Condition)
    if (group.holesCompleted >= ROUND_GOAL) {
      group.status = 'FINISHED';
      delete groupsOnCourse[groupId];
      logs.push(`[Finished] Group ${group.name} completes the required ${ROUND_GOAL} holes.`);
      return { newState, logs };
    }

    let nextHole = group.currentHole + 1;
    logs.push(`Group ${group.name} finished hole ${group.currentHole}, moving to hole ${nextHole}.`);

    // 2. Handle inter-section loop/transition logic (Loop Logic)
    
    // A. Handle 27 -> 1 Loop: When Hole 27 is finished (nextHole = 28) and the course supports 27 holes, loop to Hole 1
    if (nextHole === 28 && totalHoles >= 27) {
        if (teeBoxes.hasOwnProperty(1)) {
            nextHole = 1;
            logs.push(`[Loop] Group ${group.name} finished Hole 27 and loops to Tee Box 1.`);
        }
    } 
    // B. Handle 18 -> 1 Loop: When Hole 18 is finished (nextHole = 19) and the course is 18 holes or less, loop to Hole 1
    //    If totalHoles > 18 (e.g., 27), when nextHole=19, it will be handled by the teeBoxes check below and transition to Hole 19
    else if (nextHole === 19 && totalHoles <= 18) {
        if (teeBoxes.hasOwnProperty(1)) {
            nextHole = 1;
            logs.push(`[Loop] Group ${group.name} finished Hole 18 and loops to Tee Box 1.`);
        }
    }

    // 3. Check if the next hole is a tee box (requires transition/queuing, e.g., Hole 10, Hole 19, or the looped Hole 1)
    if (teeBoxes.hasOwnProperty(nextHole)) {
      delete groupsOnCourse[groupId]; // Remove from the general on-course list
      transitioningGroups[nextHole].push(group); // Add to the priority transition queue
      logs.push(`[Transition] Group ${group.name} is now waiting for Tee Box ${nextHole}.`);
    } else {
      // Just moving to the next hole, update the hole number
      group.currentHole = nextHole;
    }

    // After the group enters the transition queue, execute a schedule check immediately to see if they can immediately fill a tee box
    const schedulingResult = this.fillEmptyTeeBoxes(newState);

    return {
      newState: schedulingResult.newState,
      logs: [...logs, ...schedulingResult.logs]
    };
  }
};
