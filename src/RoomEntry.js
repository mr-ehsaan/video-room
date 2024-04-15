import React, { useState } from 'react';
import { database } from './firebase-config';
import { ref, set, push, onDisconnect } from 'firebase/database';
import { useAuth } from './AuthContext';
import { signOut } from "firebase/auth";
import { auth } from './firebase-config';

function RoomEntry({ onRoomJoined }) {
  const [roomId, setRoomId] = useState('');
  const { currentUser } = useAuth();

  const createRoom = () => {
    const newRoomRef = push(ref(database, 'rooms'));
    const newRoomId = newRoomRef.key;
    set(newRoomRef, { owner: currentUser.uid });
    onRoomJoined(newRoomId);

    const participantRef = push(ref(database, `rooms/${newRoomId}/participants`));
    set(participantRef, { uid: currentUser.uid });

    onDisconnect(newRoomRef).remove();
  };

  const joinRoom = () => {
    if (roomId.trim() === '') return;
    onRoomJoined(roomId);
    const participantRef = push(ref(database, `rooms/${roomId}/participants`));
    set(participantRef, { uid: currentUser.uid });
    onDisconnect(participantRef).remove();
  };

  const handleLogout = () => {
    signOut(auth).then(() => {
      console.log("User signed out successfully");
    }).catch((error) => {
      console.error("Error signing out: ", error);
    });
  };

  return (
    <div>
      <button onClick={createRoom}>Create Room</button>
      <input type="text" value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="Enter Room ID to join" />
      <button onClick={joinRoom}>Join Room</button>
      
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default RoomEntry;
