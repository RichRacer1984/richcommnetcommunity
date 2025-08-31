import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { 
  MessageCircle, 
  Send, 
  Lock, 
  Shield, 
  Circle,
  Users,
  RefreshCw
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ChatPolling = ({ currentUser }) => {
  const [chatRooms, setChatRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [lastMessageId, setLastMessageId] = useState(null);
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    loadChatRooms();
    return () => {
      // Cleanup polling interval on component unmount
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Set up polling for messages when room is selected
    if (currentRoom) {
      setIsConnected(true);
      startPolling();
    } else {
      setIsConnected(false);
      stopPolling();
    }

    return () => stopPolling();
  }, [currentRoom]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadChatRooms = async () => {
    try {
      const response = await axios.get(`${API}/chat/rooms`);
      setChatRooms(response.data);
    } catch (error) {
      console.error('Error loading chat rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (room) => {
    // Stop previous polling
    stopPolling();
    
    setCurrentRoom(room);
    setMessages([]);
    setLastMessageId(null);
    setIsConnected(false);

    try {
      // Load recent messages
      const historyResponse = await axios.get(`${API}/chat/messages/${room.id}`);
      const roomMessages = historyResponse.data.messages || [];
      setMessages(roomMessages);
      
      if (roomMessages.length > 0) {
        setLastMessageId(roomMessages[roomMessages.length - 1].id);
      }

      // Join room on backend
      await axios.post(`${API}/chat/rooms/${room.id}/join`);
      
      // Load online users
      await loadOnlineUsers();
      
      setIsConnected(true);
      
    } catch (error) {
      console.error('Error joining room:', error);
      setIsConnected(false);
    }
  };

  const startPolling = () => {
    // Poll for new messages every 2 seconds
    pollingIntervalRef.current = setInterval(() => {
      if (currentRoom) {
        pollForNewMessages();
        loadOnlineUsers();
      }
    }, 2000);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const pollForNewMessages = async () => {
    if (!currentRoom) return;

    try {
      // Get messages since last known message
      const params = lastMessageId ? { since: lastMessageId } : {};
      const response = await axios.get(`${API}/chat/messages/${currentRoom.id}`, { params });
      const newMessages = response.data.messages || [];
      
      if (newMessages.length > 0) {
        setMessages(prevMessages => {
          // Avoid duplicates by filtering out messages we already have
          const existingIds = new Set(prevMessages.map(m => m.id));
          const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));
          
          if (uniqueNewMessages.length > 0) {
            setLastMessageId(uniqueNewMessages[uniqueNewMessages.length - 1].id);
            return [...prevMessages, ...uniqueNewMessages];
          }
          return prevMessages;
        });
      }
    } catch (error) {
      console.error('Error polling for messages:', error);
    }
  };

  const loadOnlineUsers = async () => {
    try {
      const response = await axios.get(`${API}/community/online-stats`);
      const allOnlineUsers = [
        ...(response.data.online_users || []),
        ...(response.data.online_vips || []),
        ...(response.data.online_admins || []),
        ...(response.data.online_forum_moderators || [])
      ];
      setOnlineUsers(allOnlineUsers);
    } catch (error) {
      console.error('Error loading online users:', error);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !currentRoom || !isConnected) {
      return;
    }

    try {
      const messageData = {
        room_id: currentRoom.id,
        message: messageInput.trim()
      };

      const response = await axios.post(`${API}/chat/send`, messageData);
      
      // Check if this was a command with a response
      if (response.data.command_response) {
        const commandResponse = response.data.command_response;
        
        // Add command response as system message
        const systemMessage = {
          id: `cmd-${Date.now()}`,
          username: 'System',
          user_role: 'system',
          message: commandResponse.message || commandResponse.error || 'Command processed',
          timestamp: new Date().toISOString(),
          room_id: currentRoom.id
        };
        
        setMessages(prevMessages => [...prevMessages, systemMessage]);
        
        // Show success/error indicator
        if (commandResponse.type === 'error') {
          console.error('Command error:', commandResponse.message);
        } else {
          console.log('Command success:', commandResponse.message);
        }
      }
      
      setMessageInput('');
      
      // Immediately poll for new messages to get our sent message (unless it was a command)
      if (!response.data.command_response) {
        setTimeout(() => pollForNewMessages(), 500);
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Show error message to user
      if (error.response?.data?.detail) {
        const errorMessage = {
          id: `error-${Date.now()}`,
          username: 'System',
          user_role: 'system',
          message: `❌ Fehler: ${error.response.data.detail}`,
          timestamp: new Date().toISOString(),
          room_id: currentRoom.id
        };
        setMessages(prevMessages => [...prevMessages, errorMessage]);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'superuser_admin': return 'destructive';
      case 'superuser_vip': return 'default';
      case 'superuser': return 'secondary';
      case 'forum_moderator': return 'secondary';
      case 'system': return 'outline';
      default: return 'outline';
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'superuser_admin': return 'ADMIN';
      case 'superuser_vip': return 'VIP';
      case 'superuser': return 'SUPERUSER';
      case 'forum_moderator': return 'MODERATOR';
      case 'system': return 'SYSTEM';
      default: return 'USER';
    }
  };

  const canAccessRoom = (room) => {
    if (!room.is_private) return true;
    
    return currentUser.role === 'superuser_admin' || 
           currentUser.role === 'superuser_vip' ||
           (room.allowed_users && room.allowed_users.includes(currentUser.id));
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Lade Chat...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button 
            onClick={() => navigate('/community')}
            variant="outline" 
            className="mb-4 border-purple-500/20 text-purple-300 hover:bg-purple-500/10"
          >
            ← Zurück zur Community
          </Button>
          
          <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3 text-white">
                <MessageCircle className="w-6 h-6 text-purple-400" />
                <span>RichComm Chat</span>
                <Badge variant="secondary" className="ml-4">
                  Polling-basiert (Stabil)
                </Badge>
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
          {/* Chat Rooms Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20 h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <MessageCircle className="w-5 h-5" />
                  <span>Chat-Räume</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {chatRooms.map((room) => {
                    if (!canAccessRoom(room)) return null;
                    
                    const isActive = currentRoom?.id === room.id;
                    const isLocked = room.is_locked;
                    const isPrivate = room.is_private;
                    
                    return (
                      <div
                        key={room.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                          isActive 
                            ? 'bg-purple-600/30 border-purple-400/50' 
                            : 'bg-slate-700/30 border-slate-600/30 hover:bg-slate-600/30'
                        }`}
                        onClick={() => joinRoom(room)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-300'}`}>
                              {room.name}
                            </span>
                            {isLocked && <Lock className="w-3 h-3 text-red-400" />}
                            {isPrivate && <Shield className="w-3 h-3 text-yellow-400" />}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {room.active_users || 0}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Chat Area */}
          <div className="lg:col-span-2 flex flex-col">
            <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20 flex-1 flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2 text-white">
                    <MessageCircle className="w-5 h-5" />
                    <span>{currentRoom ? currentRoom.name : 'Chat'}</span>
                    {currentRoom?.is_private && <Shield className="w-4 h-4 text-yellow-400" />}
                    {currentRoom?.is_locked && <Lock className="w-4 h-4 text-red-400" />}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Circle className={`w-3 h-3 fill-current ${isConnected ? 'text-green-400' : 'text-gray-400'}`} />
                    <span className={`text-sm ${isConnected ? 'text-green-400' : 'text-gray-400'}`}>
                      {isConnected ? 'Verbunden' : 'Nicht verbunden'}
                    </span>
                    {currentRoom && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={pollForNewMessages}
                        className="text-gray-400 hover:text-white"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              {/* Messages Area */}
              <CardContent className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 pr-4 overflow-y-auto max-h-96">
                  <div className="space-y-3">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-400 py-8">
                        {currentRoom ? 'Keine Nachrichten in diesem Raum' : 'Wähle einen Chat-Raum aus'}
                      </div>
                    ) : (
                      messages.map((message, index) => (
                        <div key={message.id || index} className="flex items-start space-x-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-cyan-400 to-purple-600 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {message.username ? message.username.charAt(0).toUpperCase() : 'S'}
                            </span>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-white font-medium">
                                {message.username || 'Unbekannt'}
                              </span>
                              <Badge 
                                variant={getRoleBadgeVariant(message.user_role)} 
                                className="text-xs"
                              >
                                {getRoleDisplayName(message.user_role)}
                              </Badge>
                              <span className="text-gray-400 text-xs">
                                {formatTime(message.timestamp)}
                              </span>
                            </div>
                            <p className="text-gray-300 text-sm break-words">
                              {message.message}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Message Input */}
                {currentRoom && (
                  <div className="flex items-center space-x-3 pt-4 border-t border-slate-600/30">
                    <Input
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Nachricht eingeben..."
                      className="flex-1 bg-slate-700/50 border-slate-600 text-white placeholder-gray-400 focus:border-purple-500"
                      disabled={!isConnected}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!messageInput.trim() || !isConnected}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {currentRoom && (
                  <div className="text-xs text-gray-500 mt-2 space-y-1">
                    <div>Tipp: Verwende /help für eine Liste aller Chat-Befehle</div>
                    {currentUser.role === 'superuser_admin' && (
                      <div className="text-red-400">
                        🔥 Admin-Befehle: /su /gag /k /kh /l /mod /unmod /i /f+ /a /col
                      </div>
                    )}
                    {currentUser.role === 'superuser_vip' && (
                      <div className="text-purple-400">
                        ⭐ VIP-Befehle: /gag /k /l /mod /unmod /i /f+ /a
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Online Users Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20 h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <Users className="w-5 h-5" />
                  <span>Online ({onlineUsers.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-300px)]">
                  <div className="space-y-2">
                    {onlineUsers.length === 0 ? (
                      <div className="text-gray-400 text-center py-4">Keine Benutzer online</div>
                    ) : (
                      onlineUsers.map((user, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-slate-700/30 rounded">
                          <span 
                            className="text-white cursor-pointer hover:text-purple-300 transition-colors"
                            onClick={() => navigate(`/profile/${user.username}`)}
                          >
                            {user.username}
                          </span>
                          <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                            {getRoleDisplayName(user.role)}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPolling;