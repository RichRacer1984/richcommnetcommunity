import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { 
  MessageSquare, 
  Send, 
  Search,
  User,
  Clock,
  CheckCheck,
  Check,
  Reply,
  MoreVertical,
  Trash2,
  Edit,
  Phone,
  Video
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Messages = ({ currentUser }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (currentUser) {
      fetchConversations();
      fetchUnreadCount();
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = async () => {
    try {
      const response = await axios.get(`${API}/messages/conversations`);
      setConversations(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const response = await axios.get(`${API}/messages/conversation/${conversationId}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get(`${API}/messages/unread-count`);
      setUnreadCount(response.data.unread_count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;

    try {
      setSendingMessage(true);
      
      // Find recipient from conversation
      const recipientId = selectedConversation.participants.find(id => id !== currentUser.id);
      
      await axios.post(`${API}/messages/send`, {
        recipient_id: recipientId,
        message: newMessage.trim(),
        message_type: "text"
      });

      setNewMessage('');
      await fetchMessages(selectedConversation.id);
      await fetchConversations(); // Refresh to update last message
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const startNewConversation = async (recipientId) => {
    try {
      await axios.post(`${API}/messages/send`, {
        recipient_id: recipientId,
        message: "Hallo! 👋",
        message_type: "text"
      });

      await fetchConversations();
      setSearchUser('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await axios.get(`${API}/users/search?query=${encodeURIComponent(query)}`);
      // Filter out current user and users we already have conversations with
      const existingParticipants = conversations.flatMap(conv => conv.participants);
      const filtered = response.data.filter(user => 
        user.id !== currentUser.id && 
        !existingParticipants.includes(user.id)
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'gerade eben';
    if (diffMins < 60) return `vor ${diffMins}m`;
    if (diffHours < 24) return `vor ${diffHours}h`;
    if (diffDays < 7) return `vor ${diffDays}d`;
    return date.toLocaleDateString('de-DE');
  };

  const getConversationTitle = (conversation) => {
    return conversation.participant_usernames.find(username => username !== currentUser.username) || 'Unbekannt';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <MessageSquare className="w-10 h-10 text-purple-400" />
            <h1 className="text-4xl font-bold text-white">Nachrichten</h1>
            {unreadCount > 0 && (
              <Badge className="bg-red-600 text-white">
                {unreadCount}
              </Badge>
            )}
          </div>
          <p className="text-xl text-gray-300 mb-4">Private Unterhaltungen mit der Community</p>
          
          {/* Back to Dashboard Button */}
          <Button 
            onClick={() => window.location.href = '/community'}
            className="mb-4 bg-purple-600 hover:bg-purple-700"
          >
            🏠 Zurück zum Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <div className="lg:col-span-4">
            <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20 h-full">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>Unterhaltungen</span>
                  <Badge variant="secondary">{conversations.length}</Badge>
                </CardTitle>
                
                {/* New Conversation Search */}
                <div className="space-y-2">
                  <Input
                    value={searchUser}
                    onChange={(e) => {
                      setSearchUser(e.target.value);
                      searchUsers(e.target.value);
                    }}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="Neue Unterhaltung starten..."
                  />
                  {searchResults.length > 0 && (
                    <div className="bg-slate-700 rounded-lg border border-slate-600 max-h-32 overflow-y-auto">
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          className="p-2 hover:bg-slate-600 cursor-pointer flex items-center space-x-2"
                          onClick={() => startNewConversation(user.id)}
                        >
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-white">{user.username}</span>
                          {user.is_vip && <Badge className="bg-purple-600 text-xs">VIP</Badge>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100%-140px)]">
                  <div className="space-y-2 p-4">
                    {conversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedConversation?.id === conversation.id
                            ? 'bg-purple-600/30 border-purple-400'
                            : 'bg-slate-700/30 hover:bg-slate-600/30'
                        } border border-slate-600/30`}
                        onClick={() => setSelectedConversation(conversation)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-white font-medium">{getConversationTitle(conversation)}</h4>
                          <div className="flex items-center space-x-1">
                            {conversation.unread_counts && conversation.unread_counts[currentUser.id] > 0 && (
                              <Badge className="bg-red-600 text-white text-xs">
                                {conversation.unread_counts[currentUser.id]}
                              </Badge>
                            )}
                            <span className="text-xs text-gray-400">
                              {formatTimestamp(conversation.last_message_at)}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-300 text-sm truncate">
                          {conversation.last_message || 'Keine Nachrichten'}
                        </p>
                      </div>
                    ))}
                    {conversations.length === 0 && (
                      <div className="text-center py-8">
                        <MessageSquare className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400">Noch keine Unterhaltungen</p>
                        <p className="text-gray-500 text-sm">Suche nach Benutzern um zu chatten</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-8">
            {selectedConversation ? (
              <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20 h-full flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <User className="w-6 h-6 text-purple-400" />
                      <span>{getConversationTitle(selectedConversation)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" className="border-slate-600 text-gray-300">
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="border-slate-600 text-gray-300">
                        <Video className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                
                {/* Messages */}
                <CardContent className="flex-1 flex flex-col p-0">
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.sender_id === currentUser.id ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.sender_id === currentUser.id
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-700 text-white'
                            }`}
                          >
                            <p className="text-sm">{message.message}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs opacity-70">
                                {formatTimestamp(message.timestamp)}
                              </span>
                              {message.sender_id === currentUser.id && (
                                <div className="flex items-center space-x-1">
                                  {message.is_read ? (
                                    <CheckCheck className="w-3 h-3 text-blue-400" />
                                  ) : (
                                    <Check className="w-3 h-3 opacity-70" />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                  
                  {/* Message Input */}
                  <div className="p-4 border-t border-slate-600/30">
                    <div className="flex items-center space-x-2">
                      <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        className="bg-slate-700 border-slate-600 text-white resize-none"
                        placeholder="Nachricht eingeben... (Enter zum Senden)"
                        rows={2}
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || sendingMessage}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20 h-full flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-24 h-24 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-white mb-2">Wähle eine Unterhaltung</h3>
                  <p className="text-gray-400">Klicke auf eine Unterhaltung links oder starte eine neue</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;