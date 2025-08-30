"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { signAndSendTxWithWallet } from '../../providers/solana-wallet';

interface PendingCall {
  name: string;
  call_id: string;
  args: string;
}

interface VoiceTutorProps {
  onClose?: () => void;
}

export default function VoiceTutor({ onClose }: VoiceTutorProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { wallet, connected } = useWallet();
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const pendingCallsRef = useRef<Map<string, PendingCall>>(new Map());

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
            
            // Optimize result for AI - send a summary instead of full data
            if (fullResult.items && Array.isArray(fullResult.items)) {
              result = {
                success: true,
                total: fullResult.items.length,
                query: parsed.q,
                items: fullResult.items.slice(0, 10).map((item: any) => ({
                  id: item.id,
                  name: item.name,
                  collection: item.collection,
                  compressed: item.compressed,
                  image_available: !!item.image
                })),
                message: `Found ${fullResult.items.length} NFTs matching "${parsed.q}". Showing first 10 results.`
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
          if (!connected || !wallet) {
            result = { error: "Wallet not connected. Please connect your wallet first." };
          } else {
            const sigResult = await signAndSendTxWithWallet(
              parsed.txBase64, 
              parsed.connection || "mainnet", 
              wallet
            );
            result = sigResult;
          }
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
  }, [connected, wallet, postJSON]);

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
    try {
      setIsConnecting(true);
      setError(null);

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

      setIsConnected(true);
      setIsRecording(true);
      setTranscript(["🎤 Voice tutor connected! Start speaking to ask about Solana NFTs."]);
      console.log(`🎉 Voice session ready!`);
      
    } catch (error) {
      console.error("❌ Voice connection error:", error);
      console.error("❌ Error details:", {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      });
      setError(error instanceof Error ? error.message : "Connection failed");
    } finally {
      setIsConnecting(false);
    }
  }, [handleDataChannelMessage]);

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
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="glass-card rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-hidden backdrop-blur-xl border border-white/20">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
            <h2 className="text-2xl font-bold text-white">🎤 Voice NFT Tutor</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Wallet Connection */}
        {!connected && (
          <div className="mb-6 p-4 glass-light rounded-2xl border border-yellow-400/30">
            <p className="text-yellow-200 mb-3 text-sm">
              💰 Connect your wallet to enable NFT trading features
            </p>
            <WalletMultiButton className="!bg-gradient-to-r !from-yellow-500 !to-orange-500 !rounded-xl" />
          </div>
        )}

        {/* Connection Status */}
        {!isConnected && (
          <div className="text-center mb-6">
            <button
              onClick={connect}
              disabled={isConnecting}
              className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${
                isConnecting 
                  ? "bg-gray-600 cursor-not-allowed text-gray-300" 
                  : "bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-400 hover:to-blue-500 text-white shadow-2xl hover:shadow-green-500/25 transform hover:scale-105"
              }`}
            >
              {isConnecting ? (
                <div className="flex items-center gap-3">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting...
                </div>
              ) : (
                "🚀 Start Voice Session"
              )}
            </button>
            
            {error && (
              <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Active Session */}
        {isConnected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-400">
                <div className={`w-3 h-3 rounded-full bg-green-400 ${isRecording ? 'animate-pulse' : ''}`} />
                <span className="text-sm font-medium">Voice session active</span>
              </div>
              <button
                onClick={disconnect}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl transition-colors"
              >
                End Session
              </button>
            </div>

            {/* Transcript */}
            <div className="glass-light rounded-2xl p-4 max-h-64 overflow-y-auto">
              <h3 className="text-white/80 text-sm font-medium mb-2">Conversation:</h3>
              {transcript.length === 0 ? (
                <p className="text-white/50 text-sm italic">Listening for your voice...</p>
              ) : (
                <div className="space-y-2">
                  {transcript.filter(t => t.trim()).map((text, index) => (
                    <p key={index} className="text-white/90 text-sm leading-relaxed">
                      {text}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="glass-light rounded-2xl p-4 border border-blue-400/30">
              <h4 className="text-blue-300 font-medium mb-2">💡 Try saying:</h4>
              <ul className="text-white/70 text-sm space-y-1">
                <li>&ldquo;Find me some fox NFTs&rdquo;</li>
                <li>&ldquo;What are the cheapest listings for Mad Lads?&rdquo;</li>
                <li>&ldquo;Help me buy an NFT from Solana Monkey Business&rdquo;</li>
                <li>&ldquo;How do I sell my NFT?&rdquo;</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
