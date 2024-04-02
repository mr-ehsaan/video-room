import React, { useState } from 'react';
import { database } from './firebase-config';
import { ref, set, push, onDisconnect } from 'firebase/database';
import { useAuth } from './AuthContext';
import { signOut } from "firebase/auth"; // Import signOut method
import { auth } from './firebase-config'; // Ensure you have auth exported in your firebase-config

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

    // Setup onDisconnect to remove the room if the user is the owner
    onDisconnect(newRoomRef).remove();
  };

  const joinRoom = () => {
    if (roomId.trim() === '') return;
    onRoomJoined(roomId);
    
    const participantRef = push(ref(database, `rooms/${roomId}/participants`));
    set(participantRef, { uid: currentUser.uid });

    // Remove participant on disconnect
    onDisconnect(participantRef).remove();
  };

  const handleLogout = () => {
    signOut(auth).then(() => {
      console.log("User signed out successfully");
      // Perform any additional cleanup or state updates as needed
    }).catch((error) => {
      console.error("Error signing out: ", error);
    });
  };

  return (
    <div>
      <button onClick={createRoom}>Create Room</button>
      <input type="text" value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="Enter Room ID to join" />
      <button onClick={joinRoom}>Join Room</button>
      {/* Logout Button */}
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default RoomEntry;
