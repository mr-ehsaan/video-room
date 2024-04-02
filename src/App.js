// src/App.js
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import SignIn from './SignIn';
import RoomEntry from './RoomEntry';
import VideoCall from './VideoCall';

function VideoRoomApp() {
  const { currentUser } = useAuth();
  const [roomId, setRoomId] = useState('');
  const handleRoomLeave = () => {
    window.location.reload();
    setRoomId(''); // Reset roomId to navigate back to the main page
  };
  return (
    <div>
      {!currentUser && <SignIn />}
      {currentUser && !roomId && <RoomEntry onRoomJoined={setRoomId} />}
      {currentUser && roomId && <VideoCall roomId={roomId} onLeaveRoom={handleRoomLeave}/>}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <VideoRoomApp />
    </AuthProvider>
  );
}

export default App;
