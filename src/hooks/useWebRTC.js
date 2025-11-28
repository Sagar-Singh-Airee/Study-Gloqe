// src/hooks/useWebRTC.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { 
    doc, 
    collection, 
    setDoc, 
    getDoc, 
    onSnapshot, 
    updateDoc,
    arrayRemove,
    increment,
    serverTimestamp,
    addDoc,
    query,
    orderBy,
    limit
} from 'firebase/firestore';
import { db } from '@/config/firebase';

// Free Google STUN servers
const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ]
};

export const useWebRTC = (roomId, userId, userName) => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState(new Map());
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [peers, setPeers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [isConnected, setIsConnected] = useState(false);

    const peerConnections = useRef(new Map());
    const localStreamRef = useRef(null);
    const dataChannels = useRef(new Map());

    // Initialize local media stream
    const initializeMedia = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            localStreamRef.current = stream;
            setLocalStream(stream);
            setIsConnected(true);
            console.log('✅ Local media initialized');
            return stream;
        } catch (error) {
            console.error('❌ Error accessing media devices:', error);
            alert('Please allow camera and microphone access to join the room.');
            throw error;
        }
    }, []);

    // Create peer connection for a remote user
    const createPeerConnection = useCallback((remoteUserId) => {
        const pc = new RTCPeerConnection(ICE_SERVERS);

        // Add local tracks to peer connection
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current);
            });
        }

        // Handle incoming remote tracks
        pc.ontrack = (event) => {
            console.log('📹 Received remote track from:', remoteUserId);
            setRemoteStreams(prev => {
                const newMap = new Map(prev);
                newMap.set(remoteUserId, event.streams[0]);
                return newMap;
            });
        };

        // Handle ICE candidates
        pc.onicecandidate = async (event) => {
            if (event.candidate) {
                console.log('🧊 Sending ICE candidate');
                try {
                    await addDoc(collection(db, `rooms/${roomId}/iceCandidates`), {
                        candidate: event.candidate.toJSON(),
                        from: userId,
                        to: remoteUserId,
                        timestamp: serverTimestamp()
                    });
                } catch (error) {
                    console.error('Error sending ICE candidate:', error);
                }
            }
        };

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
            console.log(`Connection state (${remoteUserId}):`, pc.connectionState);
            if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                cleanupPeerConnection(remoteUserId);
            }
        };

        // Create data channel for chat
        const dataChannel = pc.createDataChannel('chat');
        dataChannel.onopen = () => console.log('💬 Data channel opened');
        dataChannel.onmessage = (event) => {
            const message = JSON.parse(event.data);
            setMessages(prev => [...prev, message]);
        };
        dataChannels.current.set(remoteUserId, dataChannel);

        // Handle incoming data channel
        pc.ondatachannel = (event) => {
            const channel = event.channel;
            channel.onmessage = (e) => {
                const message = JSON.parse(e.data);
                setMessages(prev => [...prev, message]);
            };
            dataChannels.current.set(remoteUserId, channel);
        };

        peerConnections.current.set(remoteUserId, pc);
        return pc;
    }, [roomId, userId]);

    // Create and send offer
    const createOffer = useCallback(async (remoteUserId) => {
        try {
            const pc = createPeerConnection(remoteUserId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            await setDoc(doc(db, `rooms/${roomId}/offers`, `${userId}_${remoteUserId}`), {
                offer: {
                    type: offer.type,
                    sdp: offer.sdp
                },
                from: userId,
                to: remoteUserId,
                timestamp: serverTimestamp()
            });

            console.log('📤 Offer sent to:', remoteUserId);
        } catch (error) {
            console.error('Error creating offer:', error);
        }
    }, [roomId, userId, createPeerConnection]);

    // Handle incoming offer
    const handleOffer = useCallback(async (offer, remoteUserId) => {
        try {
            const pc = createPeerConnection(remoteUserId);
            await pc.setRemoteDescription(new RTCSessionDescription(offer));

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            await setDoc(doc(db, `rooms/${roomId}/answers`, `${remoteUserId}_${userId}`), {
                answer: {
                    type: answer.type,
                    sdp: answer.sdp
                },
                from: userId,
                to: remoteUserId,
                timestamp: serverTimestamp()
            });

            console.log('📤 Answer sent to:', remoteUserId);
        } catch (error) {
            console.error('Error handling offer:', error);
        }
    }, [roomId, userId, createPeerConnection]);

    // Handle incoming answer
    const handleAnswer = useCallback(async (answer, remoteUserId) => {
        try {
            const pc = peerConnections.current.get(remoteUserId);
            if (pc && pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
                console.log('✅ Answer received from:', remoteUserId);
            }
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    }, []);

    // Handle incoming ICE candidate
    const handleIceCandidate = useCallback(async (candidate, remoteUserId) => {
        try {
            const pc = peerConnections.current.get(remoteUserId);
            if (pc) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
                console.log('🧊 ICE candidate added');
            }
        } catch (error) {
            console.error('Error handling ICE candidate:', error);
        }
    }, []);

    // Clean up peer connection
    const cleanupPeerConnection = useCallback((remoteUserId) => {
        const pc = peerConnections.current.get(remoteUserId);
        if (pc) {
            pc.close();
            peerConnections.current.delete(remoteUserId);
        }
        setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.delete(remoteUserId);
            return newMap;
        });
        dataChannels.current.delete(remoteUserId);
    }, []);

    // Join room
    const joinRoom = useCallback(async () => {
        try {
            await initializeMedia();

            const roomRef = doc(db, 'rooms', roomId);
            const roomSnap = await getDoc(roomRef);

            if (!roomSnap.exists()) {
                throw new Error('Room not found');
            }

            // Add user to participants list
            await updateDoc(roomRef, {
                participants: arrayRemove({ userId, userName }),
                updatedAt: serverTimestamp()
            });

            await updateDoc(roomRef, {
                participants: [...roomSnap.data().participants || [], { userId, userName, joinedAt: new Date() }],
                updatedAt: serverTimestamp()
            });

            console.log('✅ Joined room successfully');
        } catch (error) {
            console.error('Error joining room:', error);
            throw error;
        }
    }, [roomId, userId, userName, initializeMedia]);

    // Send chat message
    const sendMessage = useCallback((text) => {
        const message = {
            text,
            sender: userName,
            senderId: userId,
            timestamp: new Date().toISOString()
        };

        // Send via data channels to all peers
        dataChannels.current.forEach((channel) => {
            if (channel.readyState === 'open') {
                channel.send(JSON.stringify(message));
            }
        });

        // Add to local messages
        setMessages(prev => [...prev, message]);

        // Also save to Firestore for persistence
        addDoc(collection(db, `rooms/${roomId}/messages`), {
            ...message,
            timestamp: serverTimestamp()
        }).catch(console.error);
    }, [roomId, userId, userName]);

    // Toggle audio
    const toggleAudio = useCallback(() => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioEnabled(audioTrack.enabled);
            }
        }
    }, []);

    // Toggle video
    const toggleVideo = useCallback(() => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoEnabled(videoTrack.enabled);
            }
        }
    }, []);

    // Leave room
    const leaveRoom = useCallback(async () => {
        try {
            // Stop all tracks
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }

            // Close all peer connections
            peerConnections.current.forEach((pc) => pc.close());
            peerConnections.current.clear();

            // Close data channels
            dataChannels.current.clear();

            // Update Firestore
            const roomRef = doc(db, 'rooms', roomId);
            await updateDoc(roomRef, {
                participants: arrayRemove({ userId, userName }),
                memberCount: increment(-1),
                updatedAt: serverTimestamp()
            });

            setLocalStream(null);
            setRemoteStreams(new Map());
            setIsConnected(false);
            console.log('✅ Left room successfully');
        } catch (error) {
            console.error('Error leaving room:', error);
        }
    }, [roomId, userId, userName]);

    // Listen for room participants and signaling
    useEffect(() => {
        if (!roomId || !userId) return;

        const unsubscribers = [];

        // Listen for participants
        const roomRef = doc(db, 'rooms', roomId);
        const unsubRoom = onSnapshot(roomRef, (snapshot) => {
            const data = snapshot.data();
            if (data?.participants) {
                setPeers(data.participants.filter(p => p.userId !== userId));
            }
        });
        unsubscribers.push(unsubRoom);

        // Listen for offers
        const offersRef = collection(db, `rooms/${roomId}/offers`);
        const unsubOffers = onSnapshot(offersRef, (snapshot) => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    if (data.to === userId) {
                        handleOffer(data.offer, data.from);
                    }
                }
            });
        });
        unsubscribers.push(unsubOffers);

        // Listen for answers
        const answersRef = collection(db, `rooms/${roomId}/answers`);
        const unsubAnswers = onSnapshot(answersRef, (snapshot) => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    if (data.to === userId) {
                        handleAnswer(data.answer, data.from);
                    }
                }
            });
        });
        unsubscribers.push(unsubAnswers);

        // Listen for ICE candidates
        const candidatesRef = collection(db, `rooms/${roomId}/iceCandidates`);
        const unsubCandidates = onSnapshot(candidatesRef, (snapshot) => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    if (data.to === userId) {
                        handleIceCandidate(data.candidate, data.from);
                    }
                }
            });
        });
        unsubscribers.push(unsubCandidates);

        // Listen for messages
        const messagesRef = query(
            collection(db, `rooms/${roomId}/messages`),
            orderBy('timestamp', 'desc'),
            limit(50)
        );
        const unsubMessages = onSnapshot(messagesRef, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).reverse();
            setMessages(msgs);
        });
        unsubscribers.push(unsubMessages);

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [roomId, userId, handleOffer, handleAnswer, handleIceCandidate]);

    // Create offers when new peers join
    useEffect(() => {
        peers.forEach(peer => {
            if (!peerConnections.current.has(peer.userId)) {
                createOffer(peer.userId);
            }
        });
    }, [peers, createOffer]);

    return {
        localStream,
        remoteStreams,
        isAudioEnabled,
        isVideoEnabled,
        peers,
        messages,
        isConnected,
        joinRoom,
        leaveRoom,
        toggleAudio,
        toggleVideo,
        sendMessage
    };
};
