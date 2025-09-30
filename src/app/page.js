'use client';

import useSWR from 'swr';
import { useState } from 'react';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function HomePage() {
  const { data: state, error, mutate } = useSWR('/api/teetime/status', fetcher, {
    refreshInterval: 5000,
  });

  const [groupName, setGroupName] = useState('');
  const [logs, setLogs] = useState([]);

  const addLog = (newLogs) => {
    if (newLogs && newLogs.length > 0) {
      setLogs(prev => [...newLogs, ...prev.slice(0, 100)]); // Keep last 100 logs
    }
  };

  const handleApiCall = async (url, body) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await res.json();
    if (result.logs) addLog(result.logs);
    if (res.ok) mutate(); // Re-fetch data on success
    return result;
  };

  const handleInitialize = () => handleApiCall('/api/teetime/initialize', {});
  const handleAddGroup = (e) => {
    e.preventDefault();
    if (groupName) {
      handleApiCall('/api/teetime/add-group', { name: groupName });
      setGroupName('');
    }
  };
  const handleTeeOff = (groupId) => handleApiCall('/api/teetime/tee-off', { groupId });
  const handleFinishHole = (groupId) => handleApiCall('/api/teetime/finish-hole', { groupId });

  if (error) return <div>Failed to load</div>;
  if (!state) return <div>Loading...</div>;

  const groupsOnCourse = state.groupsOnCourse ? Object.values(state.groupsOnCourse) : [];

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', display: 'flex', gap: '20px' }}>
      <div style={{ flex: 1 }}>
        <h1>Tee Time Management</h1>
        <button onClick={handleInitialize}>Initialize / Reset System</button>

        <form onSubmit={handleAddGroup} style={{ margin: '20px 0' }}>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="New Group Name"
          />
          <button type="submit">Add to Waiting List</button>
        </form>

        <h2>Current Status</h2>
        {state.message ? <p>{state.message}</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h3>Waiting List ({state.waitingList?.length || 0})</h3>
              <ul>{state.waitingList?.map(g => <li key={g.id}>{g.name}</li>)}</ul>
            </div>

            <div style={{ display: 'flex', gap: '30px' }}>
              {Object.entries(state.teeBoxes || {}).map(([hole, groups]) => (
                <div key={hole} style={{ border: '1px solid #ccc', padding: '10px' }}>
                  <h4>Tee Box {hole} ({groups.length}/{state.maxGroupsPerTeeBox})</h4>
                  {state.transitioningGroups?.[hole]?.length > 0 && (
                    <div style={{ fontSize: '0.8em', color: 'blue' }}>
                      Waiting (Priority): {state.transitioningGroups[hole].map(g => g.name).join(', ')}
                    </div>
                  )}
                  <ol>
                    {groups.map((group, index) => (
                      <li key={group.id}>
                        {group.name}
                        {index === 0 && (
                          <button onClick={() => handleTeeOff(group.id)} style={{ marginLeft: '10px' }}>Tee Off</button>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>

            <div>
              <h3>Groups On Course ({groupsOnCourse.length})</h3>
              <table border="1" cellPadding="5">
                <thead>
                  <tr><th>Group Name</th><th>Current Hole</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {groupsOnCourse.map(group => (
                    <tr key={group.id}>
                      <td>{group.name}</td>
                      <td>{group.currentHole}</td>
                      <td>
                        <button onClick={() => handleFinishHole(group.id)}>Finish Hole {group.currentHole}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, borderLeft: '1px solid #eee', paddingLeft: '20px' }}>
        <h2>Logs</h2>
        <div style={{ backgroundColor: '#f0f0f0', height: '80vh', overflowY: 'scroll', padding: '10px', fontSize: '0.9em' }}>
          {logs.map((log, i) => <div key={i} style={{ borderBottom: '1px solid #ddd', padding: '2px 0' }}>{log}</div>)}
        </div>
      </div>
    </div>
  );
}