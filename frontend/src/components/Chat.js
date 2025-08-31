import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { 
  MessageCircle, 
  Users, 
  Send, 
  Crown, 
  Shield, 
  Clock,
  Settings,
  ArrowLeft,
  Circle,
  Lock,
  Unlock
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
// Fix WebSocket URL for Kubernetes environment
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');

const Chat = ({ currentUser }) => {
  const [chatRooms, setChatRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [roomUsers, setRoomUsers] = useState([]);
  const [wsConnection, setWsConnection] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadChatRooms();
    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatRooms = async () => {
    try {
      const response = await axios.get(`${API}/chat/rooms`);
      setChatRooms(response.data);
      
      // Auto-join Hauptraum if available
      const hauptraum = response.data.find(room => room.name === 'Hauptraum');
      if (hauptraum && !currentRoom) {
        joinRoom(hauptraum);
      }
    } catch (error) {
      console.error('Error loading chat rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (room) => {
    // Leave current WebSocket if connected
    if (wsConnection) {
      wsConnection.close();
    }

    setCurrentRoom(room);
    setMessages([]);
    setConnectionStatus('connecting');

    try {
      // Load recent messages
      const historyResponse = await axios.get(`${API}/chat/messages/${room.id}`);
      setMessages(historyResponse.data.messages || []);

      // Connect WebSocket
      const token = localStorage.getItem('token');
      const ws = new WebSocket(`${WS_URL}/api/ws/chat/${room.id}?token=${token}`);

      ws.onopen = () => {
        setConnectionStatus('connected');
        console.log(`Connected to ${room.name}`, 'WebSocket Ready State:', ws.readyState);
      };

      ws.onmessage = (event) => {
        const messageData = JSON.parse(event.data);
        handleIncomingMessage(messageData);
        
        // Ensure we're marked as connected when receiving messages
        if (connectionStatus !== 'connected') {
          setConnectionStatus('connected');
        }
      };

      ws.onclose = (event) => {
        setConnectionStatus('disconnected');
        console.log(`Disconnected from ${room.name}`, 'Code:', event.code, 'Reason:', event.reason);
      };

      ws.onerror = (error) => {
        setConnectionStatus('error');
        console.error('WebSocket error:', error);
      };

      setWsConnection(ws);

      // Update backend about room join
      await axios.post(`${API}/chat/rooms/${room.id}/join`);
      
    } catch (error) {
      console.error('Error joining room:', error);
      setConnectionStatus('error');
    }
  };

  const handleIncomingMessage = (messageData) => {
    switch (messageData.type) {
      case 'message':
        setMessages(prev => [...prev, messageData]);
        break;
      case 'system':
        setMessages(prev => [...prev, {
          ...messageData,
          username: 'System',
          user_role: 'system'
        }]);
        break;
      case 'room_info':
        setRoomUsers(messageData.users || []);
        setMessages(prev => [...prev, {
          type: 'system',
          username: 'System',
          message: messageData.message,
          timestamp: new Date().toISOString(),
          user_role: 'system'
        }]);
        break;
      case 'info':
      case 'success':
      case 'error':
        setMessages(prev => [...prev, {
          type: messageData.type,
          username: 'System',
          message: messageData.message,
          timestamp: new Date().toISOString(),
          user_role: 'system'
        }]);
        break;
      default:
        console.log('Unknown message type:', messageData);
    }

    // Refresh room list to update user counts
    loadChatRooms();
  };

  const sendMessage = () => {
    // Debug logging to help identify issues
    console.log('sendMessage called:', {
      messageInput: messageInput.trim(),
      wsConnection: !!wsConnection,
      connectionStatus,
      wsReadyState: wsConnection?.readyState
    });

    if (!messageInput.trim()) {
      console.log('Message is empty, not sending');
      return;
    }

    if (!wsConnection) {
      console.log('No WebSocket connection available');
      setConnectionStatus('error');
      return;
    }

    // Check WebSocket ready state instead of our connection status
    if (wsConnection.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not ready:', wsConnection.readyState);
      setConnectionStatus('connecting');
      return;
    }

    try {
      const messageData = {
        message: messageInput.trim()
      };

      console.log('Sending message:', messageData);
      wsConnection.send(JSON.stringify(messageData));
      setMessageInput('');
      
      // Ensure connection status is correct
      if (connectionStatus !== 'connected') {
        setConnectionStatus('connected');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setConnectionStatus('error');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'superuser_admin': return 'ADMIN';
      case 'superuser_vip': return 'VIP';
      case 'forum_moderator': return 'MOD';
      case 'superuser': return 'SUPER';
      case 'system': return 'SYSTEM';
      default: return 'USER';
    }
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'superuser_admin': return 'destructive';
      case 'superuser_vip': return 'default';
      case 'forum_moderator': return 'secondary';
      case 'superuser': return 'outline';
      case 'system': return 'outline';
      default: return 'outline';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-400';
      case 'connecting': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const canAccessRoom = (room) => {
    if (!room.is_private) return true;
    
    return currentUser.role === 'superuser_admin' || 
           currentUser.role === 'superuser_vip' ||
           (room.allowed_users && room.allowed_users.includes(currentUser.id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Lade Chat-System...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent mb-2">
                RichComm Chat
              </h1>
              <p className="text-gray-300">Real-time Community Chat</p>
            </div>
            <Button 
              onClick={() => window.location.href = '/community'}
              variant="outline"
              className="border-purple-500/20 text-purple-300 hover:bg-purple-500/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück zur Community
            </Button>
          </div>
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
                        
                        {room.user_list && room.user_list.length > 0 && (
                          <div className="text-xs text-gray-400">
                            {room.user_list.slice(0, 3).map(u => u.username).join(', ')}
                            {room.user_list.length > 3 && ` +${room.user_list.length - 3}`}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20 h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2 text-white">
                    <MessageCircle className="w-5 h-5" />
                    <span>{currentRoom ? currentRoom.name : 'Chat'}</span>
                    {currentRoom?.is_private && <Shield className="w-4 h-4 text-yellow-400" />}
                    {currentRoom?.is_locked && <Lock className="w-4 h-4 text-red-400" />}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Circle className={`w-3 h-3 fill-current ${getConnectionStatusColor()}`} />
                    <span className={`text-sm ${getConnectionStatusColor()}`}>
                      {connectionStatus === 'connected' && 'Verbunden'}
                      {connectionStatus === 'connecting' && 'Verbinde...'}
                      {connectionStatus === 'disconnected' && 'Getrennt'}
                      {connectionStatus === 'error' && 'Fehler'}
                    </span>
                  </div>
                </div>
              </CardHeader>

              {/* Messages Area */}
              <CardContent className="flex-1 flex flex-col min-h-0">
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-3">
                    {messages.map((message, index) => (
                      <div key={index} className="flex items-start space-x-3">
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
                            {message.is_vip && <Crown className="w-3 h-3 text-yellow-400" />}
                            <span className="text-xs text-gray-400">
                              {formatTimestamp(message.timestamp)}
                            </span>
                          </div>
                          
                          <div className={`text-sm whitespace-pre-wrap ${
                            message.type === 'system' ? 'text-gray-300 italic' :
                            message.type === 'error' ? 'text-red-300' :
                            message.type === 'success' ? 'text-green-300' :
                            message.type === 'info' ? 'text-blue-300' :
                            'text-gray-200'
                          }`}>
                            {message.message}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="mt-4 pt-4 border-t border-slate-600/30">
                  <div className="flex space-x-2">
                    <Input
                      ref={inputRef}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={
                        connectionStatus === 'connected' 
                          ? "Nachricht eingeben... (/ für Befehle)" 
                          : "Nicht verbunden..."
                      }
                      className="flex-1 bg-slate-700 border-slate-600 text-white placeholder-gray-400"
                      disabled={connectionStatus !== 'connected'}
                    />
                    <Button
                      onClick={sendMessage}
                      className="bg-purple-600 hover:bg-purple-700"
                      disabled={connectionStatus !== 'connected' || !messageInput.trim()}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-400">
                    Tipp: Verwende /help für eine Liste aller Chat-Befehle
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Users Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20 h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <Users className="w-5 h-5" />
                  <span>
                    Online ({currentRoom?.active_users || 0})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {currentRoom?.user_list?.map((user, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-700/30 rounded">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                        <span className="text-white text-sm">{user.username}</span>
                        {user.is_vip && <Crown className="w-3 h-3 text-yellow-400" />}
                      </div>
                      <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                        {getRoleDisplayName(user.role)}
                      </Badge>
                    </div>
                  ))}
                  
                  {(!currentRoom?.user_list || currentRoom.user_list.length === 0) && (
                    <div className="text-center text-gray-400 py-4">
                      Keine Benutzer online
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Chat Commands Help */}
        <Card className="mt-6 bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white text-lg">Chat-Befehle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="space-y-1">
                <div className="text-purple-300 font-medium">Allgemeine Befehle:</div>
                <div className="text-gray-300">/w - Benutzer im Raum</div>
                <div className="text-gray-300">/w &lt;name&gt; - Benutzer-Info</div>
                <div className="text-gray-300">/wc - Alle Räume</div>
                <div className="text-gray-300">/sepa &lt;raum&gt; - Privaten Raum erstellen</div>
                <div className="text-gray-300">/i &lt;name&gt; - Chat-Einladungen</div>
                <div className="text-gray-300">/f+ &lt;name&gt; - Freundschaftsanfrage</div>
                <div className="text-gray-300">/a - Freundschaftsanfrage annehmen</div>
                <div className="text-gray-300">/col &lt;hex&gt; - Schriftfarbe ändern</div>
              </div>
              
              {(currentUser.role === 'forum_moderator' || 
                currentUser.role === 'superuser_vip' || 
                currentUser.role === 'superuser_admin' ||
                currentUser.temp_superuser) && (
                <div className="space-y-1">
                  <div className="text-green-300 font-medium">Moderations-Befehle:</div>
                  <div className="text-gray-300">/gag &lt;name&gt; - Benutzer knebeln</div>
                  <div className="text-gray-300">/k &lt;name&gt; - Ins Exil schicken</div>
                  <div className="text-gray-300">/l &lt;raum&gt; - Raum sperren</div>
                  <div className="text-gray-300">/mod - Raum moderieren (nur VIP/Admin)</div>
                  <div className="text-gray-300">/unmod - Moderation deaktivieren</div>
                </div>
              )}
              
              {(currentUser.role === 'superuser_vip' || currentUser.role === 'superuser_admin') && (
                <div className="space-y-1">
                  <div className="text-red-300 font-medium">Admin-Befehle:</div>
                  <div className="text-gray-300">/su &lt;name&gt; - SUPERUSER Rechte</div>
                  <div className="text-gray-300">/kh &lt;name&gt; [min] - Aus Chat werfen</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Chat;