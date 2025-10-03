'use client';

import useSWR from 'swr';
import { useState } from 'react';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function HomePage() {
  const { data: state, error, mutate } = useSWR('/api/teetime/status', fetcher, {
    refreshInterval: 5000,
  });

  const [groupName, setGroupName] = useState('');
  const [totalHoles, setTotalHoles] = useState(18);
  const [logs, setLogs] = useState([]);

  const addLog = (newLogs) => {
    if (newLogs && newLogs.length > 0) {
      setLogs(prev => [...newLogs, ...prev.slice(0, 100)]); // Keep last 100 logs
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
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

  const handleInitialize = () => {
    const holes = parseInt(totalHoles, 10);
    handleApiCall('/api/teetime/initialize', { totalHoles: holes });
  }

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
        <h1>Tee Time Management (Total Holes: {state.totalHoles})</h1>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '24px' }}>
            <label htmlFor="totalHolesSelect" style={{ fontWeight: 'bold' }}>Set Total Holes:</label>
            <select
              id="totalHolesSelect"
              value={totalHoles}
              onChange={(e) => setTotalHoles(e.target.value)}
              style={{
                height: '40px',
                padding: '0 8px',
                borderRadius: '6px',
              }}
            >
              <option value={18}>18</option>
              <option value={27}>27</option>
            </select>
          </div>
          <button
            onClick={handleInitialize}
            style={{
              width: '290px',
              height: '40px',
              borderRadius: '6px',
              marginTop: '10px',
              cursor: 'pointer',
            }}
          >
            Initialize / Reset System
          </button>
        </div>
        <form onSubmit={handleAddGroup} style={{ margin: '20px 0' }}>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="New Group Name"
            style={{
              height: '40px',
            }}
          />
          <button
            type="submit"
            style={{
              width: '120px',
              height: '40px',
              borderRadius: '6px',
              cursor: 'pointer',
              marginLeft: '3px',
            }}
          >
            Add to Waiting List
          </button>
        </form>

        <h2 style={{ marginBottom: '16px', marginTop: '24px' }}>Current Status</h2>
        {state.message ? <p>{state.message}</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '65vh', overflowY: 'auto' }}>
            <div>
              <h3>Waiting List ({state.waitingList?.length || 0})</h3>
              <ul>{state.waitingList?.map(g => <li key={g.id}>{g.name}</li>)}</ul>
            </div>

            <div style={{ display: 'flex', gap: '30px' }}>
              {Object.entries(state.teeBoxes || {}).map(([hole, groups]) => (
                <div key={hole} style={{ border: '1px solid #ccc', padding: '16px' }}>
                  <h4>Tee Box {hole} ({groups.length}/{state.maxGroupsPerTeeBox})</h4>
                  {state.transitioningGroups?.[hole]?.length > 0 && (
                    <div style={{ fontSize: '0.8em', color: '#9eff71ff', marginTop: '3px' }}>
                      Waiting (Priority): {state.transitioningGroups[hole].map(g => g.name).join(', ')}
                    </div>
                  )}
                  <ol style={{ padding: '12px' }}>
                    {groups.map((group, index) => (
                      <li key={group.id}>
                        {group.name}
                        {index === 0 && (
                          <button onClick={() => handleTeeOff(group.id)} style={{ marginLeft: '10px', cursor: 'pointer' }}>Tee Off</button>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>

            <div>
              <h3 style={{ marginBottom: '16px' }}>Groups On Course ({groupsOnCourse.length})</h3>
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
                        <button style={{ padding: '3px 8px', cursor: 'pointer' }} onClick={() => handleFinishHole(group.id)}>Finish Hole {group.currentHole}</button>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Logs</h2>
          <button 
            onClick={handleClearLogs}
            style={{ 
              padding: '5px 10px', 
              cursor: 'pointer', 
              borderRadius: '4px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              fontSize: '0.85em'
            }}
          >
            Clear Logs
          </button>
        </div>
        <div style={{ backgroundColor: '#f0f0f0', height: '90vh', overflowY: 'auto', padding: '10px', fontSize: '0.9em', marginTop: '8px' }}>
          {logs.map((log, i) => <div key={i} style={{ borderBottom: '1px solid #ddd', padding: '2px 0', color: 'black' }}>{log}</div>)}
        </div>
      </div>
    </div>
  );
}