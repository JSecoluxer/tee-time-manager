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
   */
  initializeState(totalHoles = 18, maxGroupsPerTeeBox = 3) {
    const teeBoxes = {};
    if (totalHoles >= 18) {
      teeBoxes[1] = [];
      if (totalHoles >= 10) teeBoxes[10] = [];
    }
    if (totalHoles > 18 && totalHoles >= 19) teeBoxes[19] = [];

    // Initialize the transition queue
    const transitioningGroups = {};
    Object.keys(teeBoxes).forEach(hole => {
      // Hole 1 won't have transitioning groups, but can be kept for structural consistency
      if (hole !== '1') {
        transitioningGroups[hole] = [];
      }
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

    const nextHole = group.currentHole + 1;
    logs.push(`Group ${group.name} finished hole ${group.currentHole}, moving to hole ${nextHole}.`);

    if (nextHole > totalHoles) {
      // Finished all holes
      group.status = 'FINISHED';
      delete groupsOnCourse[groupId]; // Remove from the course
      logs.push(`[Finished] Group ${group.name} has completed the course.`);
      return { newState, logs };
    }

    // Check if the next hole is a tee box (requires transition)
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
