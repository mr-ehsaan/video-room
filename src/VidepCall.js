import React, { useEffect, useRef, useState } from "react";
import { database } from "./firebase-config";
import {
  ref,
  onValue,
  set,
  remove,
  push,
  off,
  child,
  get,
} from "firebase/database";
import { useAuth } from "./AuthContext";

function VideoCall({ roomId, onLeaveRoom }) {
  const { currentUser } = useAuth();

  const [isMuted, setIsMuted] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [participants, setParticipants] = useState([]);
  const peerConnections = useRef({});
  const localVideoRef = useRef();
  const remoteVideoRefs = useRef({});
  const localStreamRef = useRef();

  // ICE servers
  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  useEffect(() => {
    // Get user's media
    const roomRef = ref(database, `rooms/${roomId}`);
    get(roomRef).then((snapshot) => {
      if (snapshot.exists() && snapshot.val().owner === currentUser.uid) {
        setIsOwner(true);
      }
    });
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localVideoRef.current.srcObject = stream;
        localStreamRef.current = stream;
      })
      .catch(console.error);

    // Listen for participants
    const participantsRef = ref(database, `rooms/${roomId}/participants`);
    onValue(participantsRef, (snapshot) => {
      const participantsList = snapshot.val()
        ? Object.keys(snapshot.val())
        : [];
      handleParticipantsChanged(participantsList);
    });

    return () => {
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      Object.values(peerConnections.current).forEach((pc) => pc.close());
      off(participantsRef);
    };
  }, [roomId]);

  // Handle participants joining or leaving
  function handleParticipantsChanged(participantsList) {
    // Add new participants
    participantsList.forEach((participantId) => {
      if (
        !peerConnections.current[participantId] &&
        participantId !== currentUser.uid
      ) {
        const pc = new RTCPeerConnection(iceServers);
        peerConnections.current[participantId] = pc;

        // Add tracks to peer connection
        localStreamRef.current?.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });

        // Create offer for new peer
        if (participantId > currentUser.uid) {
          pc.createOffer().then((offer) => {
            pc.setLocalDescription(offer);
            const offerRef = ref(
              database,
              `rooms/${roomId}/offers/${participantId}`
            );
            set(offerRef, {
              sdp: offer.sdp,
              type: offer.type,
              from: currentUser.uid,
            });
          });
        }

        // Handle remote stream
        pc.ontrack = (event) => {
          if (remoteVideoRefs.current[participantId]) {
            remoteVideoRefs.current[participantId].srcObject = event.streams[0];
          }
        };

        // Collect ICE candidates
        collectIceCandidates(roomId, participantId, pc);
      }
    });

    // Remove participants who left
    Object.keys(peerConnections.current).forEach((participantId) => {
      if (!participantsList.includes(participantId)) {
        if (peerConnections.current[participantId]) {
          peerConnections.current[participantId].close();
        }
        delete peerConnections.current[participantId];
      }
    });

    setParticipants(participantsList);
  }

  // ICE candidates function
  function collectIceCandidates(roomId, participantId, pc) {
    const iceCandidatesRef = ref(
      database,
      `rooms/${roomId}/candidates/${currentUser.uid}/${participantId}`
    );

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const newCandidateRef = push(iceCandidatesRef);
        set(newCandidateRef, event.candidate.toJSON());
      }
    };

    // Listen for remote ICE candidates
    const remoteIceCandidateRef = ref(
      database,
      `rooms/${roomId}/candidates/${participantId}/${currentUser.uid}`
    );
    onValue(remoteIceCandidateRef, (snapshot) => {
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const candidate = new RTCIceCandidate(childSnapshot.val());
          pc.addIceCandidate(candidate);
        });
      }
    });

    return () => {
      off(iceCandidatesRef);
      off(remoteIceCandidateRef);
    };
  }

  // Signaling - listening for offers/answers
  useEffect(() => {
    const offersRef = ref(database, `rooms/${roomId}/offers`);
    onValue(offersRef, (snapshot) => {
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const data = childSnapshot.val();
          const pc = peerConnections.current[data.from];
          if (data.type === "offer" && pc.signalingState !== "stable") {
            pc.setRemoteDescription(new RTCSessionDescription(data))
              .then(() => {
                return pc.createAnswer();
              })
              .then((answer) => {
                return pc.setLocalDescription(answer);
              })
              .then(() => {
                const answerRef = ref(
                  database,
                  `rooms/${roomId}/answers/${data.from}`
                );
                set(answerRef, {
                  sdp: pc.localDescription.sdp,
                  type: pc.localDescription.type,
                  to: data.from,
                });
              });
          }
        });
      }
    });

    const answersRef = ref(
      database,
      `rooms/${roomId}/answers/${currentUser.uid}`
    );
    onValue(answersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const pc = peerConnections.current[data.to];
        if (pc.signalingState !== "stable") {
          pc.setRemoteDescription(new RTCSessionDescription(data));
        }
      }
    });

    return () => {
      off(offersRef);
      off(answersRef);
    };
  }, [roomId, currentUser.uid]);

  const toggleMute = () => {
    const currentlyEnabled = localStreamRef.current.getAudioTracks()[0].enabled;
    localStreamRef.current.getAudioTracks()[0].enabled = !currentlyEnabled;
    setIsMuted(!!currentlyEnabled);
  };

  const stopMediaTracks = () => {
    localStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
  };

  // In VideoCall.js
  const leaveRoom = async () => {
    localStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    if (currentUser) {
      const participantRef = ref(
        database,
        `rooms/${roomId}/participants/${currentUser.uid}`
      );
      await remove(participantRef);

      const roomRef = ref(database, `rooms/${roomId}/participants`);
      const snapshot = await get(roomRef);
      if (!snapshot.exists() || Object.keys(snapshot.val()).length === 0) {
        const roomToDeleteRef = ref(database, `rooms/${roomId}`);
        await remove(roomToDeleteRef);
      }
    }

    onLeaveRoom();
  };

  const deleteRoom = async () => {
    await remove(ref(database, `rooms/${roomId}`));
    onLeaveRoom();
  };

  // Render videos
  return (
    <div>
      <p>Room ID: {roomId}</p>
      <p>Participants: {participants.length}</p>
      <video ref={localVideoRef} autoPlay playsInline />
      {participants.map((participantId) => (
        <video
          key={participantId}
          ref={(el) => (remoteVideoRefs.current[participantId] = el)}
          autoPlay
          playsInline
        />
      ))}
      <button onClick={toggleMute}>{isMuted ? "Unmute" : "Mute"}</button>
      <button onClick={leaveRoom}>Leave Room</button>
      {isOwner && <button onClick={deleteRoom}>Delete Room</button>}
    </div>
  );
}

export default VideoCall;
