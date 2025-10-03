# ⛳ Tee Time Scheduling Service (TeeTimeService)

This service provides a **stateless** core logic for simulating and managing the scheduling and movement of golf groups on a course. It is designed to efficiently handle groups moving from the waiting list to the course, and transitioning between different course sections.

## Core Design Principles

The service adopts a **pure function** design: every function accepts the current system state (`state`) and returns a **new**, updated state (`newState`). This approach ensures that the scheduling logic is highly predictable and easily testable.

---

## State Structure Overview

The system state (`state`) tracks all activity across the course:

| Property Name | Purpose | Key Role |
| :--- | :--- | :--- |
| `totalHoles` | Course Configuration | The total number of holes (e.g., 18, 27). |
| `maxGroupsPerTeeBox` | Scheduling Buffer | The maximum number of groups allowed in each Tee Box queue (acting as a buffer). |
| **`waitingList`** | Priority 2 Source | The queue of groups waiting to start their round. |
| **`teeBoxes`** | Buffer Area | **Starting hole locations** (e.g., Hole 1, 10, 19) where groups wait to tee off. |
| **`transitioningGroups`** | Priority 1 Source | **Transfer Waiting Area**. Groups that have finished a section (e.g., 9 or 18 holes) and are waiting to transition to the next starting tee box. |
| **`groupsOnCourse`** | Tracking | The list of groups currently playing on the fairway. |

---

## Core Scheduling Algorithm

### 1. Filling Empty Tee Boxes (`fillEmptyTeeBoxes`)

This is the core scheduling mechanism that ensures the course runs continuously. When any of the starting tee boxes (`teeBoxes`) have a vacancy, this function automatically dispatches groups based on the following **priority order**:

| Priority | Source | Action |
| :--- | :--- | :--- |
| **1. Transitioning Groups** | `transitioningGroups` | **Prioritizes** groups that have just completed a round section and are waiting to continue playing. |
| **2. New Tee Off Groups** | `waitingList` | After the transitioning queue is empty, new groups from the waiting list are moved into the vacant tee box. |

### 2. Tee Off Operation (`teeOffGroup`)

Simulates a group formally starting their round and leaving the buffer:

* A group must be at the **front of its `teeBoxes` queue** to be cleared for tee off.
* Once the group tees off, it is moved into `groupsOnCourse`.
* After the tee off creates a vacancy, the system **immediately** triggers `fillEmptyTeeBoxes` to ensure the empty slot is instantly filled by the next waiting group.

---

## 3. Group Movement and Transition Logic (`finishHole`)

This function handles the logic for a group completing the current hole and moving forward:

1.  **Round Completion Check:** If the group reaches **18 holes** (or the required goal), it is removed from the system and marked as `FINISHED`.
2.  **Section Loop Logic:**
    * **18 to 1 Loop:** If a group finishes Hole 18 on a course with $\le 18$ total holes, it loops back to **Tee Box 1**.
    * **27 to 1 Loop:** If a group finishes Hole 27 on a course with $\ge 27$ total holes, it loops back to **Tee Box 1**.
3.  **Entering Transition Queue:** If the group's next hole is a defined **starting tee box** (e.g., Hole 10 or 19), the group is removed from `groupsOnCourse` and placed into the corresponding **`transitioningGroups` queue**, awaiting the next scheduling cycle.
4.  **Continuous Scheduling:** Once the group moves or enters the transition queue, the system **immediately** triggers `fillEmptyTeeBoxes` to check if the group can instantly be dispatched to the next tee box.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
