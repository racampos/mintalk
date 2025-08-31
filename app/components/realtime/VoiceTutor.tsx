"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useWeb3AuthConnect } from '@web3auth/modal/react';
import { useSolanaWallet, useSignAndSendTransaction } from '@web3auth/modal/react/solana';
import { VersionedTransaction } from '@solana/web3.js';

// Global connection guard to prevent multiple instances
let globalConnectionAttempt = false;
let globalConnectionId: string | null = null;

interface PendingCall {
  name: string;
  call_id: string;
  args: string;
}

interface VoiceTutorProps {
  isActive: boolean;
  onSessionEnd: () => void;
  onConnectionStatusChange: (status: 'connecting' | 'connected' | 'disconnected') => void;
  onSearchResults: (results: { items: any[], query: string, searchNote?: string }) => void;
  listingsData?: Record<string, any>;
}

export default function VoiceTutor({ isActive, onSessionEnd, onConnectionStatusChange, onSearchResults, listingsData = {} }: VoiceTutorProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { isConnected: walletConnected } = useWeb3AuthConnect();
  const { accounts } = useSolanaWallet();
  const { signAndSendTransaction, data: transactionSignature, loading: txLoading, error: txError } = useSignAndSendTransaction();
  
  // Component ID for debugging
  const componentId = useRef(Math.random().toString(36).substring(2, 8));
  


  // Status changes are now handled directly when state changes occur
  // This eliminates React state batching/timing issues

  // Session end management is handled by the disconnect() function and parent state
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const pendingCallsRef = useRef<Map<string, PendingCall>>(new Map());
  const connectionAttemptRef = useRef<boolean>(false);

  // Helper function to post JSON to API endpoints
  const postJSON = useCallback(async (url: string, data: any) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  }, []);

  // Tool execution handler
  const executeToolCall = useCallback(async (call: PendingCall) => {
    console.log(`🔧 Executing tool: ${call.name}`, call.args);
    
    try {
      const parsed = JSON.parse(call.args || "{}");
      let result: any;

      switch (call.name) {
        case "search_nfts":
          try {
            // Build search parameters correctly
            const searchParams = new URLSearchParams();
            if (parsed.q) searchParams.set('q', parsed.q);
            if (parsed.includeCompressed !== undefined) searchParams.set('includeCompressed', parsed.includeCompressed.toString());
            if (parsed.page) searchParams.set('page', parsed.page.toString());
            if (parsed.limit) searchParams.set('limit', parsed.limit.toString());
            
            console.log(`🔍 Searching NFTs with params:`, searchParams.toString());
            const searchResponse = await fetch(`/api/search?${searchParams}`);
            
            if (!searchResponse.ok) {
              throw new Error(`Search API returned ${searchResponse.status}: ${searchResponse.statusText}`);
            }
            
            const fullResult = await searchResponse.json();
            console.log(`🎯 Search result:`, fullResult);
            
            // Update UI with full results (voice-first integration)
            if (fullResult.items && Array.isArray(fullResult.items)) {
              console.log(`🎙️ Updating UI with voice search results for query: "${parsed.q}"`);
              onSearchResults({
                items: fullResult.items,
                query: parsed.q,
                searchNote: fullResult.searchNote
              });

              // Generate price summary from available listings data
              const listingsCount = Object.keys(listingsData).length;
              const listedNFTs = Object.values(listingsData).filter((listing: any) => listing.status === 'listed');
              const priceRange = listedNFTs.length > 0 ? {
                min: Math.min(...listedNFTs.map((l: any) => l.price || 0)),
                max: Math.max(...listedNFTs.map((l: any) => l.price || 0)),
                count: listedNFTs.length
              } : null;

              let priceMessage = "";
              if (priceRange && priceRange.count > 0) {
                if (priceRange.count === 1) {
                  priceMessage = ` I found 1 NFT currently listed for ${priceRange.min.toFixed(2)} SOL.`;
                } else {
                  priceMessage = ` I found ${priceRange.count} NFTs with active listings, ranging from ${priceRange.min.toFixed(2)} to ${priceRange.max.toFixed(2)} SOL.`;
                }
              } else if (listingsCount > 0) {
                priceMessage = " I'm still checking prices in the background - most appear to not be currently listed.";
              } else {
                priceMessage = " I'm now checking current market prices for these NFTs.";
              }
              
              // Optimize result for AI - include sample NFTs with mint addresses for reference
              result = {
                success: true,
                total: fullResult.items.length,
                query: parsed.q,
                ui_updated: true,
                price_summary: priceRange,
                sample_nfts: fullResult.items.slice(0, 5).map((item: any) => ({
                  name: item.name,
                  mint_address: item.id,
                  collection: item.collection,
                  compressed: item.compressed
                })),
                message: `Successfully found ${fullResult.items.length} NFTs matching "${parsed.q}". The search results are now displayed on your screen in a visual grid.${priceMessage} You can see live price badges appearing on each NFT as the data loads.`
              };
            } else {
              result = {
                success: false,
                error: fullResult.error || "No results found",
                query: parsed.q
              };
            }
          } catch (searchError) {
            console.error(`❌ Search API error:`, searchError);
            result = {
              success: false,
              error: `Search failed: ${searchError instanceof Error ? searchError.message : String(searchError)}`,
              query: parsed.q
            };
          }
          break;

        case "get_listings":
          result = await postJSON("/api/agent-tools/listings", parsed);
          break;

        case "buy_nft":
          result = await postJSON("/api/agent-tools/buy", parsed);
          break;

        case "sell_nft":
          result = await postJSON("/api/agent-tools/sell", parsed);
          break;

        case "request_wallet_signature":
          if (!walletConnected || !accounts || accounts.length === 0) {
            result = { error: "Wallet not connected. Please login with your social account first." };
          } else {
            try {
              // Decode the base64 transaction
              const txBuffer = Buffer.from(parsed.txBase64, 'base64');
              const transaction = VersionedTransaction.deserialize(txBuffer);
              
              // Sign and send the transaction using Web3Auth
              await signAndSendTransaction(transaction);
              
              // Wait for the transaction signature result
              if (transactionSignature) {
                result = { signature: transactionSignature };
              } else if (txError) {
                result = { error: txError.message };
              } else {
                result = { error: "Transaction signing failed" };
              }
            } catch (error) {
              console.error('Error signing transaction:', error);
              result = { 
                error: error instanceof Error ? error.message : 'Unknown error signing transaction' 
              };
            }
          }
          break;

        case "get_price_summary":
          result = await postJSON("/api/agent-tools/price-summary", parsed);
          break;

        default:
          result = { error: `Unknown tool: ${call.name}` };
      }

      // Send tool result back to the model via conversation.item.create
      if (dataChannelRef.current) {
        const toolResultMessage = {
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: call.call_id,
            output: JSON.stringify(result),
          },
        };
        console.log(`📤 Sending tool result:`, toolResultMessage);
        dataChannelRef.current.send(JSON.stringify(toolResultMessage));
      }
    } catch (error) {
      console.error(`❌ Error executing tool ${call.name}:`, error);
      if (dataChannelRef.current) {
        const errorResult = {
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: call.call_id,
            output: JSON.stringify({ error: "Tool execution failed", details: error instanceof Error ? error.message : String(error) }),
          },
        };
        console.log(`📤 Sending error result:`, errorResult);
        dataChannelRef.current.send(JSON.stringify(errorResult));
      }
    }
  }, [walletConnected, accounts, signAndSendTransaction, transactionSignature, txError, postJSON, onSearchResults, listingsData]);

  // Handle data channel messages
  const handleDataChannelMessage = useCallback(async (event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);
      console.log(`📨 Received message:`, message.type, message);
      
      // Special handling for function call messages
      if (message.type?.includes('function_call')) {
        console.log(`🔧 Function call message details:`, {
          type: message.type,
          call_id: message.call_id,
          name: message.name,
          delta: message.delta,
          fullMessage: message
        });
      }
      
      // Handle different message types
      switch (message.type) {
        case "response.function_call_arguments.delta":
          console.log(`🔄 Function call delta:`, message.name, message.delta);
          const existingCall = pendingCallsRef.current.get(message.call_id) || {
            call_id: message.call_id,
            name: message.name || "",
            args: ""
          };
          // Update the name if it's provided in this delta (sometimes it comes later)
          if (message.name) {
            existingCall.name = message.name;
          }
          existingCall.args += message.delta || "";
          pendingCallsRef.current.set(message.call_id, existingCall);
          break;

        case "response.function_call_arguments.done":
          console.log(`✅ Function call done:`, message.call_id);
          const completedCall = pendingCallsRef.current.get(message.call_id);
          if (completedCall) {
            // CRITICAL: Update the function name from the done message
            if (message.name) {
              completedCall.name = message.name;
              console.log(`🎯 Updated function name to: ${message.name}`);
            }
            console.log(`🚀 Executing completed call:`, completedCall);
            await executeToolCall(completedCall);
            pendingCallsRef.current.delete(message.call_id);
          }
          break;

        case "response.text.delta":
          // Update transcript with streaming text
          setTranscript(prev => {
            const newTranscript = [...prev];
            if (newTranscript.length > 0) {
              newTranscript[newTranscript.length - 1] += message.delta || "";
            } else {
              newTranscript.push(message.delta || "");
            }
            return newTranscript;
          });
          break;

        case "response.text.done":
          // Add a new line for the next response
          setTranscript(prev => [...prev, ""]);
          break;

        case "conversation.item.created":
          console.log(`✅ Conversation item created:`, message);
          // If this is a function_call_output item, trigger a response from the model
          if (message.item?.type === "function_call_output") {
            console.log(`🚀 Triggering model response after tool result`);
            if (dataChannelRef.current) {
              const responseRequest = {
                type: "response.create",
                response: {
                  modalities: ["text", "audio"],
                },
              };
              console.log(`📤 Requesting model response:`, responseRequest);
              dataChannelRef.current.send(JSON.stringify(responseRequest));
            }
          }
          break;

        default:
          // Log any unhandled message types, especially ones that might contain function info
          if (message.type?.includes('function') || message.type?.includes('tool')) {
            console.log(`🤷 Unhandled function-related message:`, message.type, message);
          } else if (!message.type?.includes('audio') && !message.type?.includes('input_audio')) {
            // Skip noisy audio messages but log other potentially important ones
            console.log(`🔍 Unhandled message type:`, message.type);
          }
          break;
      }
    } catch (error) {
      console.error("Error handling data channel message:", error);
    }
  }, [executeToolCall]);

  // Connect to OpenAI Realtime API
  const connect = useCallback(async () => {
    console.log(`🚀 VoiceTutor [${componentId.current}] connect() called`);
    
    // Prevent double connections using global guard (React StrictMode issue)
    if (globalConnectionAttempt) {
      console.log(`🛑 VoiceTutor [${componentId.current}] Connection already in progress globally (ID: ${globalConnectionId}), skipping...`);
      return;
    }
    
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      console.log(`📡 VoiceTutor [${componentId.current}] Starting connection...`);
      globalConnectionAttempt = true;
      globalConnectionId = componentId.current;
      connectionAttemptRef.current = true;
      console.log(`🔄 VoiceTutor [${componentId.current}] Setting isConnecting = true`);
      setIsConnecting(true);
      setError(null);
      
      // Immediately notify parent of connecting status
      console.log(`🔄 VoiceTutor [${componentId.current}] Directly calling onConnectionStatusChange('connecting')`);
      onConnectionStatusChange('connecting');

      // Safety timeout to reset global flags if connection hangs
      timeoutId = setTimeout(() => {
        console.log(`⏰ VoiceTutor [${componentId.current}] Connection timeout - resetting global flags`);
        globalConnectionAttempt = false;
        globalConnectionId = null;
      }, 30000); // 30 second timeout

      // Get ephemeral token from our API
      const requestId = Math.random().toString(36).substring(2, 8);
      console.log(`🔑 Requesting ephemeral token from /api/realtime... (Request ID: ${requestId})`);
      
      // Add cache-busting parameter to ensure fresh token
      const tokenResponse = await fetch(`/api/realtime?_t=${Date.now()}&_rid=${requestId}`);
      console.log(`📡 Token response status: ${tokenResponse.status}`);
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error(`❌ Failed to get token:`, errorText);
        throw new Error(`Failed to get realtime session token: ${tokenResponse.status}`);
      }
      
      const tokenData = await tokenResponse.json();
      console.log(`🎟️ Token data received:`, tokenData);
      
      const { client_secret } = tokenData;
      if (!client_secret || !client_secret.value) {
        console.error(`❌ Invalid client_secret:`, client_secret);
        throw new Error("Invalid client_secret received from server");
      }
      
      console.log(`🔐 Client secret: ${client_secret.value.substring(0, 10)}...${client_secret.value.substring(client_secret.value.length - 4)}`);
      console.log(`⏰ Expires at: ${client_secret.expires_at} (raw timestamp)`);
      
      // Check token freshness immediately after receiving it
      const now = new Date();
      const expiresAt = new Date(client_secret.expires_at * 1000);
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      const secondsUntilExpiry = Math.floor(timeUntilExpiry / 1000);
      
      console.log(`⏰ Token freshness check:`);
      console.log(`   Now: ${now.toISOString()}`);
      console.log(`   Expires: ${expiresAt.toISOString()}`);
      console.log(`   Time until expiry: ${secondsUntilExpiry} seconds`);
      console.log(`   Token fresh: ${secondsUntilExpiry > 0}`);
      
      // Abort if token is already expired when we receive it
      if (secondsUntilExpiry <= 0) {
        throw new Error(`Token expired immediately upon receipt! Server clock may be wrong. Token was ${Math.abs(secondsUntilExpiry)} seconds old.`);
      }
      
      // Warn if token expires very soon (less than 30 seconds)
      if (secondsUntilExpiry < 30) {
        console.warn(`⚠️ Token expires very soon (${secondsUntilExpiry}s). WebRTC connection might fail.`);
      }

      // Create peer connection
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      // Create data channel for tool communication
      const dc = pc.createDataChannel("oai-events");
      dataChannelRef.current = dc;
      
      dc.onmessage = handleDataChannelMessage;
      dc.onopen = () => console.log("Data channel opened");
      dc.onclose = () => console.log("Data channel closed");

      // Setup audio element for playback
      const audioEl = new Audio();
      audioEl.autoplay = true;
      audioElementRef.current = audioEl;

      pc.ontrack = (event) => {
        audioEl.srcObject = event.streams[0];
      };

      // Get user media (microphone)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send SDP offer to OpenAI Realtime endpoint
      // Note: Model is already configured in the server-side session creation
      console.log(`🌐 Connecting to OpenAI WebRTC endpoint...`);
      console.log(`📝 SDP Offer length: ${offer.sdp?.length} characters`);
      console.log(`🔑 Using client_secret for auth: ${client_secret.value.substring(0, 10)}...`);
      
      const requestHeaders = {
        Authorization: `Bearer ${client_secret.value}`,
        "Content-Type": "application/sdp",
      };
      console.log(`📋 Request headers:`, requestHeaders);
      console.log(`🎯 Request URL: https://api.openai.com/v1/realtime`);
      
      const realtimeResponse = await fetch("https://api.openai.com/v1/realtime", {
        method: "POST",
        headers: requestHeaders,
        body: offer.sdp,
      });

      console.log(`🔌 WebRTC response status: ${realtimeResponse.status}`);
      
      if (!realtimeResponse.ok) {
        const errorText = await realtimeResponse.text();
        console.error(`❌ WebRTC connection failed:`, {
          status: realtimeResponse.status,
          statusText: realtimeResponse.statusText,
          body: errorText
        });
        
        // Check if token is expired (OpenAI returns timestamp in seconds, not milliseconds)
        const now = new Date();
        const expiresAt = new Date(client_secret.expires_at * 1000);
        console.log(`⏰ Token status: now=${now.toISOString()}, expires=${expiresAt.toISOString()}, expired=${now > expiresAt}`);
        
        throw new Error(`Realtime connection failed: ${realtimeResponse.status} - ${errorText}`);
      }

      const answerSDP = await realtimeResponse.text();
      console.log(`✅ Received SDP answer, length: ${answerSDP.length} characters`);
      
      await pc.setRemoteDescription({ type: "answer", sdp: answerSDP });
      console.log(`🔗 WebRTC peer connection established successfully`);

      console.log(`🔄 VoiceTutor [${componentId.current}] Setting isConnecting = false, isConnected = true`);
      setIsConnecting(false);  // Clear connecting state first
      setIsConnected(true);
      setIsRecording(true);
      setTranscript(["🎤 Voice tutor connected! Start speaking to ask about Solana NFTs."]);
      console.log(`🎉 Voice session ready!`);
      
      // Immediately notify parent of connected status
      console.log(`🔄 VoiceTutor [${componentId.current}] Directly calling onConnectionStatusChange('connected')`);
      onConnectionStatusChange('connected');
      
    } catch (error) {
      console.error("❌ Voice connection error:", error);
      console.error("❌ Error details:", {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      });
      setError(error instanceof Error ? error.message : "Connection failed");
      
      // Notify parent of connection failure
      console.log(`🔄 VoiceTutor [${componentId.current}] Connection failed - directly calling onConnectionStatusChange('disconnected')`);
      onConnectionStatusChange('disconnected');
    } finally {
      // Clear the timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Don't check connection state here - if we succeeded, we already called 'connected'
      // If we failed, the catch block already called 'disconnected'
      
      setIsConnecting(false);
      connectionAttemptRef.current = false;
      globalConnectionAttempt = false;
      globalConnectionId = null;
      console.log(`🔄 VoiceTutor [${componentId.current}] Connection attempt reset`);
    }
  }, [handleDataChannelMessage, onConnectionStatusChange]);

  // Disconnect from the session
  const disconnect = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    
    setIsConnected(false);
    setIsRecording(false);
    setTranscript([]);
    pendingCallsRef.current.clear();
    connectionAttemptRef.current = false; // Reset connection flag
    // DON'T reset global flags during disconnect - only in connect finally block
    console.log(`🔄 VoiceTutor [${componentId.current}] Session disconnected (global flags preserved)`);
    
    // Immediately notify parent of disconnected status
    console.log(`🔄 VoiceTutor [${componentId.current}] Directly calling onConnectionStatusChange('disconnected')`);
    onConnectionStatusChange('disconnected');
  }, [onConnectionStatusChange]);

  // Auto-trigger connection/disconnection based on isActive prop
  useEffect(() => {
    if (isActive && !isConnected && !isConnecting && !connectionAttemptRef.current && !globalConnectionAttempt) {
      console.log(`🎤 VoiceTutor [${componentId.current}] Auto-starting voice session...`);
      connect();
    } else if (!isActive && isConnected) {
      console.log(`🛑 VoiceTutor [${componentId.current}] Auto-ending voice session...`);
      disconnect();
    } else if (isActive && !isConnected && !isConnecting && globalConnectionAttempt) {
      console.log(`⏭️  VoiceTutor [${componentId.current}] Skipping - connection in progress by [${globalConnectionId}]`);
    }
  }, [isActive, isConnected, isConnecting, connect, disconnect]);

  // Store current connection state in ref for cleanup
  const isConnectedRef = useRef(isConnected);
  const onConnectionStatusChangeRef = useRef(onConnectionStatusChange);
  
  // Update refs when values change
  useEffect(() => {
    isConnectedRef.current = isConnected;
    onConnectionStatusChangeRef.current = onConnectionStatusChange;
  }, [isConnected, onConnectionStatusChange]);

  // Component cleanup on unmount - no dependencies to prevent premature execution
  useEffect(() => {
    const currentComponentId = componentId.current;
    return () => {
      // If component unmounts while connected, notify parent of disconnection
      if (isConnectedRef.current) {
        console.log(`🔄 VoiceTutor [${currentComponentId}] Unmounting while connected - notifying parent`);
        onConnectionStatusChangeRef.current('disconnected');
      }
      
      // Clean up local resources but preserve global connection guard
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (dataChannelRef.current) {
        dataChannelRef.current.close();
        dataChannelRef.current = null;
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
    };
  }, []); // ✅ Empty dependencies - cleanup only runs on unmount

  // Background service - no UI needed
  return null;
}
