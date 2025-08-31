import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  UserX, 
  MessageSquare, 
  Crown, 
  Clock, 
  Search,
  Heart,
  Star,
  Trophy
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Friends = ({ currentUser }) => {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState({ sent: [], received: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      fetchFriends();
      fetchFriendRequests();
    }
  }, [currentUser]);

  const fetchFriends = async () => {
    try {
      const response = await axios.get(`${API}/friends`);
      setFriends(response.data);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      const response = await axios.get(`${API}/friends/requests`);
      setFriendRequests(response.data);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    }
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await axios.get(`${API}/users/search?query=${encodeURIComponent(query)}`);
      const filtered = response.data.filter(user => 
        user.id !== currentUser.id && 
        !friends.some(friend => friend.friend_id === user.id) &&
        !friendRequests.sent.some(req => req.recipient_id === user.id && req.status === 'pending')
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const sendFriendRequest = async (userId) => {
    try {
      await axios.post(`${API}/friends/request`, {
        recipient_id: userId,
        message: "Möchte mit dir befreundet sein! 😊"
      });
      await fetchFriendRequests();
      setSearchResults(results => results.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const respondToFriendRequest = async (requestId, accept) => {
    try {
      await axios.put(`${API}/friends/request/${requestId}/respond`, { accept });
      await fetchFriendRequests();
      if (accept) await fetchFriends();
    } catch (error) {
      console.error('Error responding to friend request:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  const getOnlineStatus = (friend) => {
    if (friend.is_online) return { text: 'Online', color: 'bg-green-500' };
    if (friend.last_seen) {
      const daysSince = Math.floor((new Date() - new Date(friend.last_seen)) / (1000 * 60 * 60 * 24));
      if (daysSince === 0) return { text: 'Heute gesehen', color: 'bg-yellow-500' };
      if (daysSince < 7) return { text: `Vor ${daysSince}d`, color: 'bg-orange-500' };
    }
    return { text: 'Offline', color: 'bg-gray-500' };
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
            <Users className="w-10 h-10 text-purple-400" />
            <h1 className="text-4xl font-bold text-white">Freunde</h1>
            <Badge className="bg-purple-600 text-white">
              {friends.length}
            </Badge>
          </div>
          <p className="text-xl text-gray-300 mb-4">Verwalte deine Community-Freundschaften</p>
          
          {/* Back to Dashboard Button */}
          <Button 
            onClick={() => window.location.href = '/community'}
            className="mb-4 bg-purple-600 hover:bg-purple-700"
          >
            🏠 Zurück zum Dashboard
          </Button>
        </div>

        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800/60 border border-purple-500/20">
            <TabsTrigger value="friends" className="data-[state=active]:bg-purple-600">
              Freunde ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="received" className="data-[state=active]:bg-purple-600">
              Anfragen ({friendRequests.received.length})
            </TabsTrigger>
            <TabsTrigger value="sent" className="data-[state=active]:bg-purple-600">
              Gesendet ({friendRequests.sent.length})
            </TabsTrigger>
            <TabsTrigger value="search" className="data-[state=active]:bg-purple-600">
              Suchen
            </TabsTrigger>
          </TabsList>

          {/* Friends List */}
          <TabsContent value="friends" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {friends.map((friend) => {
                const status = getOnlineStatus(friend);
                return (
                  <Card key={friend.friendship_id} className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-lg">
                                {friend.friend_username[0].toUpperCase()}
                              </span>
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${status.color} rounded-full border-2 border-slate-800`}></div>
                          </div>
                          <div>
                            <h3 className="text-white font-medium">{friend.friend_username}</h3>
                            <div className="flex items-center space-x-2">
                              <Badge className={
                                friend.role === 'superuser_admin' ? 'bg-red-600' :
                                friend.role === 'superuser_vip' ? 'bg-purple-600' :
                                friend.role === 'forum_moderator' ? 'bg-blue-600' : 'bg-gray-600'
                              }>
                                {friend.role === 'superuser_admin' ? 'Admin' :
                                 friend.role === 'superuser_vip' ? 'VIP' :
                                 friend.role === 'forum_moderator' ? 'Moderator' : 'User'}
                              </Badge>
                              {friend.is_vip && <Crown className="w-4 h-4 text-yellow-500" />}
                            </div>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          className="bg-purple-600 hover:bg-purple-700"
                          onClick={() => window.location.href = `/messages`}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Status:</span>
                          <span className="text-white">{status.text}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Punkte:</span>
                          <span className="text-purple-300 font-medium">{friend.points}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Freunde seit:</span>
                          <span className="text-white">{formatDate(friend.friendship_date)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {friends.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-white mb-2">Noch keine Freunde</h3>
                  <p className="text-gray-400">Sende Freundschaftsanfragen um zu starten!</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Received Requests */}
          <TabsContent value="received" className="mt-6">
            <div className="space-y-4">
              {friendRequests.received.map((request) => (
                <Card key={request.id} className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {request.sender_username[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-white font-medium">{request.sender_username}</h3>
                          <p className="text-gray-300 text-sm">{request.message}</p>
                          <p className="text-gray-500 text-xs mt-1">
                            {formatDate(request.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => respondToFriendRequest(request.id, true)}
                        >
                          <UserCheck className="w-4 h-4 mr-2" />
                          Annehmen
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500 text-red-400 hover:bg-red-500/10"
                          onClick={() => respondToFriendRequest(request.id, false)}
                        >
                          <UserX className="w-4 h-4 mr-2" />
                          Ablehnen
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {friendRequests.received.length === 0 && (
                <div className="text-center py-12">
                  <Heart className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-white mb-2">Keine neuen Anfragen</h3>
                  <p className="text-gray-400">Du hast momentan keine Freundschaftsanfragen</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Sent Requests */}
          <TabsContent value="sent" className="mt-6">
            <div className="space-y-4">
              {friendRequests.sent.map((request) => (
                <Card key={request.id} className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {request.recipient_username[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-white font-medium">{request.recipient_username}</h3>
                          <p className="text-gray-300 text-sm">{request.message}</p>
                          <p className="text-gray-500 text-xs mt-1">
                            Gesendet am {formatDate(request.created_at)}
                          </p>
                        </div>
                      </div>
                      <Badge className={
                        request.status === 'pending' ? 'bg-yellow-600' :
                        request.status === 'accepted' ? 'bg-green-600' :
                        'bg-red-600'
                      }>
                        {request.status === 'pending' ? 'Ausstehend' :
                         request.status === 'accepted' ? 'Angenommen' : 'Abgelehnt'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {friendRequests.sent.length === 0 && (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-white mb-2">Keine gesendeten Anfragen</h3>
                  <p className="text-gray-400">Du hast noch keine Freundschaftsanfragen gesendet</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Search Users */}
          <TabsContent value="search" className="mt-6">
            <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20 mb-6">
              <CardHeader>
                <CardTitle className="text-white">Neue Freunde finden</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Search className="w-5 h-5 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      searchUsers(e.target.value);
                    }}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="Benutzername eingeben..."
                  />
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchResults.map((user) => (
                <Card key={user.id} className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-white font-bold text-xl">
                          {user.username[0].toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-white font-medium mb-2">{user.username}</h3>
                      <div className="flex items-center justify-center space-x-2 mb-4">
                        <Badge className={
                          user.role === 'superuser_admin' ? 'bg-red-600' :
                          user.role === 'superuser_vip' ? 'bg-purple-600' :
                          user.role === 'forum_moderator' ? 'bg-blue-600' : 'bg-gray-600'
                        }>
                          {user.role === 'superuser_admin' ? 'Admin' :
                           user.role === 'superuser_vip' ? 'VIP' :
                           user.role === 'forum_moderator' ? 'Moderator' : 'User'}
                        </Badge>
                        {user.is_vip && <Crown className="w-4 h-4 text-yellow-500" />}
                      </div>
                      <div className="text-sm text-gray-400 mb-4">
                        <div className="flex items-center justify-center space-x-4">
                          <span>{user.points} Punkte</span>
                          <span>Seit {formatDate(user.joined_date)}</span>
                        </div>
                      </div>
                      <Button
                        className="w-full bg-purple-600 hover:bg-purple-700"
                        onClick={() => sendFriendRequest(user.id)}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Freundschaftsanfrage
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {searchQuery && searchResults.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">Keine Benutzer gefunden</h3>
                <p className="text-gray-400">Versuche einen anderen Suchbegriff</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Friends;