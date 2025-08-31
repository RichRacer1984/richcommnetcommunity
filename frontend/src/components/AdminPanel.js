import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { 
  Users, 
  Settings, 
  MessageSquare, 
  TrendingUp, 
  ShieldAlert, 
  Edit, 
  Trash2, 
  Plus,
  Crown,
  Clock,
  BarChart3,
  UserX,
  MessageCircle,
  Star,
  Coins
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminPanel = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [news, setNews] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [advertisements, setAdvertisements] = useState([]);
  const [forumModerators, setForumModerators] = useState([]);
  const [forumTopics, setForumTopics] = useState([]);
  const [pointRules, setPointRules] = useState([]);
  const [pointTransactions, setPointTransactions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Form states
  const [newsForm, setNewsForm] = useState({ title: '', content: '' });
  const [roomForm, setRoomForm] = useState({ name: '', is_private: false });
  const [broadcastForm, setBroadcastForm] = useState({ message: '', interval_minutes: 30 });
  const [adForm, setAdForm] = useState({ 
    title: '', 
    content: '', 
    link_url: '', 
    image_url: '', 
    display_location: 'sidebar',
    end_date: ''
  });
  const [pointForm, setPointForm] = useState({
    user_id: '',
    username: '',
    points: 0,
    reason: '',
    category: 'admin'
  });
  const [ruleForm, setRuleForm] = useState({
    action: '',
    points: 0,
    description: '',
    max_per_day: null
  });
  const [topicForm, setTopicForm] = useState({
    name: '',
    description: '',
    is_public: true,
    read_permission: 'read_write',
    write_permission: 'read_write'
  });
  const [editingUser, setEditingUser] = useState(null);
  const [editingNews, setEditingNews] = useState(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const [statsRes, usersRes, newsRes, roomsRes, broadcastsRes, adsRes, moderatorsRes, topicsRes, rulesRes, transactionsRes] = await Promise.all([
        axios.get(`${API}/admin/stats`),
        axios.get(`${API}/admin/users`),
        axios.get(`${API}/news`),
        axios.get(`${API}/chat/rooms`),
        axios.get(`${API}/admin/broadcasts`),
        axios.get(`${API}/admin/advertisements`),
        axios.get(`${API}/admin/forum-moderators`),
        axios.get(`${API}/forum/topics`),
        axios.get(`${API}/admin/points/rules`),
        axios.get(`${API}/points/transactions?limit=50`)
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data);
      setNews(newsRes.data);
      setChatRooms(roomsRes.data);
      setBroadcasts(broadcastsRes.data);
      setAdvertisements(adsRes.data);
      setForumModerators(moderatorsRes.data);
      setForumTopics(topicsRes.data);
      setPointRules(rulesRes.data);
      setPointTransactions(transactionsRes.data);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNews = async () => {
    try {
      await axios.post(`${API}/news`, newsForm);
      setNewsForm({ title: '', content: '' });
      loadAdminData();
    } catch (error) {
      console.error('Error creating news:', error);
    }
  };

  const updateNews = async () => {
    try {
      await axios.put(`${API}/news/${editingNews.id}`, {
        title: editingNews.title,
        content: editingNews.content
      });
      setEditingNews(null);
      loadAdminData();
    } catch (error) {
      console.error('Error updating news:', error);
    }
  };

  const deleteNews = async (newsId) => {
    try {
      await axios.delete(`${API}/news/${newsId}`);
      loadAdminData();
    } catch (error) {
      console.error('Error deleting news:', error);
    }
  };

  const updateUser = async (userId, updates) => {
    try {
      await axios.put(`${API}/admin/users/${userId}`, updates);
      loadAdminData();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const deleteUser = async (userId) => {
    try {
      await axios.delete(`${API}/admin/users/${userId}`);
      loadAdminData();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const sanctionUser = async (userId, action, pointsChange = 0) => {
    try {
      await axios.post(`${API}/admin/users/${userId}/sanction`, {
        action,
        points_change: pointsChange
      });
      loadAdminData();
    } catch (error) {
      console.error('Error sanctioning user:', error);
    }
  };

  const createChatRoom = async () => {
    try {
      await axios.post(`${API}/admin/chat-rooms`, roomForm);
      setRoomForm({ name: '', is_private: false });
      loadAdminData();
    } catch (error) {
      console.error('Error creating chat room:', error);
    }
  };

  const deleteChatRoom = async (roomId) => {
    try {
      await axios.delete(`${API}/admin/chat-rooms/${roomId}`);
      loadAdminData();
    } catch (error) {
      console.error('Error deleting chat room:', error);
    }
  };

  const createBroadcast = async () => {
    try {
      await axios.post(`${API}/admin/broadcasts`, broadcastForm);
      setBroadcastForm({ message: '', interval_minutes: 30 });
      loadAdminData();
    } catch (error) {
      console.error('Error creating broadcast:', error);
    }
  };

  const deleteBroadcast = async (broadcastId) => {
    try {
      await axios.delete(`${API}/admin/broadcasts/${broadcastId}`);
      loadAdminData();
    } catch (error) {
      console.error('Error deleting broadcast:', error);
    }
  };

  const toggleBroadcast = async (broadcastId) => {
    try {
      await axios.put(`${API}/admin/broadcasts/${broadcastId}/toggle`);
      loadAdminData();
    } catch (error) {
      console.error('Error toggling broadcast:', error);
    }
  };

  const createAdvertisement = async () => {
    try {
      await axios.post(`${API}/admin/advertisements`, adForm);
      setAdForm({ 
        title: '', 
        content: '', 
        link_url: '', 
        image_url: '', 
        display_location: 'sidebar' 
      });
      loadAdminData();
    } catch (error) {
      console.error('Error creating advertisement:', error);
    }
  };

  const deleteAdvertisement = async (adId) => {
    try {
      await axios.delete(`${API}/admin/advertisements/${adId}`);
      loadAdminData();
    } catch (error) {
      console.error('Error deleting advertisement:', error);
    }
  };

  const createForumTopic = async () => {
    try {
      await axios.post(`${API}/admin/forum/topics`, topicForm);
      setTopicForm({
        name: '',
        description: '',
        is_public: true,
        read_permission: 'read_write',
        write_permission: 'read_write'
      });
      loadAdminData();
    } catch (error) {
      console.error('Error creating forum topic:', error);
    }
  };

  const deleteForumTopic = async (topicId) => {
    try {
      await axios.delete(`${API}/admin/forum/topics/${topicId}`);
      loadAdminData();
    } catch (error) {
      console.error('Error deleting forum topic:', error);
    }
  };

  const awardPoints = async () => {
    try {
      // First find user by username
      const userSearchRes = await axios.get(`${API}/users/search?query=${pointForm.username}`);
      const user = userSearchRes.data.find(u => u.username.toLowerCase() === pointForm.username.toLowerCase());
      
      if (!user) {
        alert('Benutzer nicht gefunden');
        return;
      }

      await axios.post(`${API}/admin/points/award`, {
        user_id: user.id,
        points: pointForm.points,
        reason: pointForm.reason,
        category: 'admin'
      });

      setPointForm({
        username: '',
        points: 0,
        reason: '',
        category: 'admin'
      });
      
      loadAdminData();
      alert('Punkte erfolgreich vergeben!');
    } catch (error) {
      console.error('Error awarding points:', error);
      alert('Fehler beim Vergeben der Punkte: ' + (error.response?.data?.detail || error.message));
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'superuser_admin': return 'SUPERUSER ADMIN';
      case 'superuser_vip': return 'SUPERUSER VIP';
      case 'superuser': return 'SUPERUSER';
      case 'forum_moderator': return 'FORUM MODERATOR';
      case 'banned': return 'GESPERRT';
      default: return 'USER';
    }
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'superuser_admin': return 'destructive';
      case 'superuser_vip': return 'default';
      case 'superuser': return 'secondary';
      case 'forum_moderator': return 'default';
      case 'banned': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Lade Admin-Panel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="container mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent mb-2">
                RichComm Admin-Panel
              </h1>
              <p className="text-gray-300">Verwaltung der Community-Plattform</p>
            </div>
            <Button 
              onClick={() => window.location.href = '/community'}
              variant="outline"
              className="border-purple-500/20 text-purple-300 hover:bg-purple-500/10"
            >
              ← Zurück zur Community
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-9 bg-slate-800/60 border border-purple-500/20">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-purple-600">
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-purple-600">
              <Users className="w-4 h-4 mr-2" />
              Benutzer
            </TabsTrigger>
            <TabsTrigger value="forum" className="data-[state=active]:bg-purple-600">
              <MessageSquare className="w-4 h-4 mr-2" />
              Forum
            </TabsTrigger>
            <TabsTrigger value="points" className="data-[state=active]:bg-purple-600">
              <Coins className="w-4 h-4 mr-2" />
              Punkte
            </TabsTrigger>
            <TabsTrigger value="news" className="data-[state=active]:bg-purple-600">
              <MessageSquare className="w-4 h-4 mr-2" />
              News
            </TabsTrigger>
            <TabsTrigger value="chat" className="data-[state=active]:bg-purple-600">
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat-Räume
            </TabsTrigger>
            <TabsTrigger value="broadcast" className="data-[state=active]:bg-purple-600">
              <TrendingUp className="w-4 h-4 mr-2" />
              Broadcast
            </TabsTrigger>
            <TabsTrigger value="ads" className="data-[state=active]:bg-purple-600">
              <Star className="w-4 h-4 mr-2" />
              Werbung
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-purple-600">
              <Settings className="w-4 h-4 mr-2" />
              Einstellungen
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-cyan-400 flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Benutzer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats?.total_users || 0}</div>
                  <div className="text-sm text-green-400">
                    {stats?.recent_registrations || 0} neue diese Woche
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-green-400 flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Online
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats?.online_users || 0}</div>
                  <div className="text-sm text-gray-400">aktive Benutzer</div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-purple-400 flex items-center">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Chat-Räume
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats?.total_chat_rooms || 0}</div>
                  <div className="text-sm text-gray-400">verfügbare Räume</div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-yellow-400 flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    News
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats?.total_news || 0}</div>
                  <div className="text-sm text-gray-400">veröffentlichte News</div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white">Letzte Aktivitäten</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.slice(0, 5).map((user, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${user.is_online ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                        <span className="text-white">{user.username}</span>
                        <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                          {getRoleDisplayName(user.role)}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-400">
                        {new Date(user.last_seen).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-6">
            <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white">Benutzerverwaltung</CardTitle>
                <CardDescription className="text-gray-300">
                  Verwalten Sie alle Community-Mitglieder
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${user.is_online ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                          <span className="text-white font-medium">{user.username}</span>
                          <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                            {getRoleDisplayName(user.role)}
                          </Badge>
                          {user.is_vip && <Crown className="w-4 h-4 text-yellow-400" />}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setEditingUser(user)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-slate-800 border-purple-500/20">
                              <DialogHeader>
                                <DialogTitle className="text-white">Benutzer bearbeiten</DialogTitle>
                                <DialogDescription className="text-gray-300">
                                  Ändern Sie die Benutzerdetails und Berechtigungen
                                </DialogDescription>
                              </DialogHeader>
                              {editingUser && (
                                <div className="space-y-4">
                                  <div>
                                    <Label className="text-white">Rolle</Label>
                                    <Select 
                                      value={editingUser.role} 
                                      onValueChange={(value) => setEditingUser({...editingUser, role: value})}
                                    >
                                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-slate-700 border-slate-600">
                                        <SelectItem value="user">USER</SelectItem>
                                        <SelectItem value="superuser">SUPERUSER</SelectItem>
                                        <SelectItem value="forum_moderator">FORUM MODERATOR</SelectItem>
                                        <SelectItem value="superuser_vip">SUPERUSER VIP</SelectItem>
                                        <SelectItem value="superuser_admin">SUPERUSER ADMIN</SelectItem>
                                        <SelectItem value="banned">GESPERRT</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-white">Punkte</Label>
                                    <Input 
                                      type="number"
                                      value={editingUser.points}
                                      onChange={(e) => setEditingUser({...editingUser, points: parseInt(e.target.value) || 0})}
                                      className="bg-slate-700 border-slate-600 text-white"
                                    />
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <input 
                                      type="checkbox"
                                      checked={editingUser.is_vip}
                                      onChange={(e) => setEditingUser({...editingUser, is_vip: e.target.checked})}
                                      className="rounded"
                                    />
                                    <Label className="text-white">VIP Status</Label>
                                  </div>
                                  <div className="flex space-x-2">
                                    <Button 
                                      onClick={() => {
                                        updateUser(editingUser.id, {
                                          role: editingUser.role,
                                          points: editingUser.points,
                                          is_vip: editingUser.is_vip
                                        });
                                        setEditingUser(null);
                                      }}
                                      className="bg-purple-600 hover:bg-purple-700"
                                    >
                                      Speichern
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      onClick={() => setEditingUser(null)}
                                      className="border-slate-600"
                                    >
                                      Abbrechen
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-slate-800 border-purple-500/20">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">Benutzer löschen</AlertDialogTitle>
                                <AlertDialogDescription className="text-gray-300">
                                  Sind Sie sicher, dass Sie {user.username} löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white">
                                  Abbrechen
                                </AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteUser(user.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Löschen
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="text-gray-300">
                          <strong>E-Mail:</strong> {user.email}
                        </div>
                        <div className="text-gray-300">
                          <strong>Punkte:</strong> {user.points}
                        </div>
                        <div className="text-gray-300">
                          <strong>Mitglied seit:</strong> {new Date(user.joined_date).toLocaleDateString('de-DE')}
                        </div>
                      </div>

                      <div className="flex space-x-2 mt-3">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => sanctionUser(user.id, 'deduct_points', 100)}
                          className="text-xs border-orange-500 text-orange-300 hover:bg-orange-500/10"
                        >
                          -100 Punkte
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => sanctionUser(user.id, 'remove_write_permission')}
                          className="text-xs border-red-500 text-red-300 hover:bg-red-500/10"
                        >
                          Schreibrecht entziehen
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Forum Topics Tab */}
          <TabsContent value="forum" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Create Forum Topic */}
              <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Forum-Kategorie erstellen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-white">Name</Label>
                    <Input
                      value={topicForm.name}
                      onChange={(e) => setTopicForm({...topicForm, name: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="Kategorie-Name eingeben..."
                    />
                  </div>
                  <div>
                    <Label className="text-white">Beschreibung</Label>
                    <Textarea
                      value={topicForm.description}
                      onChange={(e) => setTopicForm({...topicForm, description: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="Kategorie-Beschreibung eingeben..."
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={topicForm.is_public}
                      onChange={(e) => setTopicForm({...topicForm, is_public: e.target.checked})}
                      className="rounded"
                    />
                    <Label htmlFor="isPublic" className="text-white">Öffentlich zugänglich</Label>
                  </div>
                  <Button
                    onClick={createForumTopic}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    disabled={!topicForm.name || !topicForm.description}
                  >
                    Kategorie erstellen
                  </Button>
                </CardContent>
              </Card>

              {/* Forum Topics List */}
              <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Forum-Kategorien ({forumTopics.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {forumTopics.map((topic) => (
                      <div key={topic.id} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-white font-medium">{topic.name}</h4>
                          <div className="flex space-x-2">
                            <Badge variant={topic.is_public ? "default" : "secondary"}>
                              {topic.is_public ? "Öffentlich" : "Privat"}
                            </Badge>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => deleteForumTopic(topic.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-gray-300 text-sm mb-2">{topic.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-400">
                          <span>{topic.thread_count || 0} Threads</span>
                          <span>{topic.post_count || 0} Posts</span>
                          <span>Erstellt: {new Date(topic.created_at).toLocaleDateString('de-DE')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Points Tab */}
          <TabsContent value="points" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Award Points */}
              <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Punkte vergeben/abziehen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-white">Benutzername</Label>
                    <Input
                      value={pointForm.username}
                      onChange={(e) => setPointForm({...pointForm, username: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="Benutzername eingeben..."
                    />
                  </div>
                  <div>
                    <Label className="text-white">Punkte (negativ zum Abziehen)</Label>
                    <Input
                      type="number"
                      value={pointForm.points}
                      onChange={(e) => setPointForm({...pointForm, points: parseInt(e.target.value) || 0})}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="z.B. 100 oder -50"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Grund</Label>
                    <Input
                      value={pointForm.reason}
                      onChange={(e) => setPointForm({...pointForm, reason: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="Grund für Punktevergabe..."
                    />
                  </div>
                  <Button
                    onClick={awardPoints}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    disabled={!pointForm.username || !pointForm.points || !pointForm.reason}
                  >
                    Punkte vergeben
                  </Button>
                </CardContent>
              </Card>

              {/* Point Rules */}
              <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Punkteregeln ({pointRules.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {pointRules.map((rule) => (
                      <div key={rule.id} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-white font-medium">{rule.description}</h4>
                          <Badge variant="secondary" className="bg-purple-600">
                            {rule.points} Punkte
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-400">
                            <span>Aktion: {rule.action}</span>
                            {rule.max_per_day && <span className="ml-4">Max/Tag: {rule.max_per_day}</span>}
                          </div>
                          <Badge className={rule.is_active ? "bg-green-600" : "bg-red-600"}>
                            {rule.is_active ? "Aktiv" : "Inaktiv"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Recent Point Transactions */}
            <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20 mt-6">
              <CardHeader>
                <CardTitle className="text-white">Letzte Punkt-Transaktionen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {pointTransactions.slice(0, 20).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${transaction.points > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div>
                          <span className="text-white font-medium">{transaction.username}</span>
                          <p className="text-gray-400 text-sm">{transaction.reason}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold ${transaction.points > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {transaction.points > 0 ? '+' : ''}{transaction.points}
                        </span>
                        <p className="text-gray-500 text-xs">
                          {new Date(transaction.created_at).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* News Tab */}
          <TabsContent value="news" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Create News */}
              <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    News erstellen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-white">Titel</Label>
                    <Input 
                      value={newsForm.title}
                      onChange={(e) => setNewsForm({...newsForm, title: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="News-Titel eingeben..."
                    />
                  </div>
                  <div>
                    <Label className="text-white">Inhalt</Label>
                    <Textarea 
                      value={newsForm.content}
                      onChange={(e) => setNewsForm({...newsForm, content: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white h-32"
                      placeholder="News-Inhalt eingeben..."
                    />
                  </div>
                  <Button 
                    onClick={createNews}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    disabled={!newsForm.title || !newsForm.content}
                  >
                    News veröffentlichen
                  </Button>
                </CardContent>
              </Card>

              {/* News List */}
              <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Veröffentlichte News</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {news.map((item) => (
                      <div key={item.id} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-white font-medium">{item.title}</h4>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setEditingNews(item)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => deleteNews(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-gray-300 text-sm mb-2">{item.content}</p>
                        <div className="text-xs text-gray-400">
                          {new Date(item.created_at).toLocaleDateString('de-DE')}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Edit News Dialog */}
            {editingNews && (
              <Dialog open={true} onOpenChange={() => setEditingNews(null)}>
                <DialogContent className="bg-slate-800 border-purple-500/20">
                  <DialogHeader>
                    <DialogTitle className="text-white">News bearbeiten</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-white">Titel</Label>
                      <Input 
                        value={editingNews.title}
                        onChange={(e) => setEditingNews({...editingNews, title: e.target.value})}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Inhalt</Label>
                      <Textarea 
                        value={editingNews.content}
                        onChange={(e) => setEditingNews({...editingNews, content: e.target.value})}
                        className="bg-slate-700 border-slate-600 text-white h-32"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        onClick={updateNews}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        Speichern
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setEditingNews(null)}
                        className="border-slate-600"
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>

          {/* Chat Rooms Tab */}
          <TabsContent value="chat" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Create Chat Room */}
              <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Chat-Raum erstellen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-white">Raum-Name</Label>
                    <Input 
                      value={roomForm.name}
                      onChange={(e) => setRoomForm({...roomForm, name: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="Chat-Raum Name..."
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox"
                      checked={roomForm.is_private}
                      onChange={(e) => setRoomForm({...roomForm, is_private: e.target.checked})}
                      className="rounded"
                    />
                    <Label className="text-white">Privater Raum</Label>
                  </div>
                  <Button 
                    onClick={createChatRoom}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    disabled={!roomForm.name}
                  >
                    Raum erstellen
                  </Button>
                </CardContent>
              </Card>

              {/* Chat Rooms List */}
              <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Chat-Räume verwalten</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {chatRooms.map((room) => (
                      <div key={room.id} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-white font-medium">{room.name}</span>
                            {room.is_private && (
                              <Badge variant="destructive" className="text-xs">
                                Privat
                              </Badge>
                            )}
                            <span className="text-gray-400 text-sm">
                              {room.users?.length || 0} Benutzer
                            </span>
                          </div>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => deleteChatRoom(room.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Broadcast Tab */}
          <TabsContent value="broadcast" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Create Broadcast */}
              <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Broadcast erstellen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-white">Nachricht</Label>
                    <Textarea 
                      value={broadcastForm.message}
                      onChange={(e) => setBroadcastForm({...broadcastForm, message: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white h-24"
                      placeholder="Broadcast-Nachricht eingeben..."
                    />
                  </div>
                  <div>
                    <Label className="text-white">Intervall (Minuten)</Label>
                    <Input 
                      type="number"
                      value={broadcastForm.interval_minutes}
                      onChange={(e) => setBroadcastForm({...broadcastForm, interval_minutes: parseInt(e.target.value) || 30})}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="30"
                    />
                  </div>
                  <Button 
                    onClick={createBroadcast}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    disabled={!broadcastForm.message}
                  >
                    Broadcast erstellen
                  </Button>
                </CardContent>
              </Card>

              {/* Broadcast List */}
              <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Aktive Broadcasts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {broadcasts.map((broadcast) => (
                      <div key={broadcast.id} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-medium">
                              {broadcast.interval_minutes}min Intervall
                            </span>
                            <Badge variant={broadcast.is_active ? "default" : "secondary"} className="text-xs">
                              {broadcast.is_active ? "Aktiv" : "Inaktiv"}
                            </Badge>
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => toggleBroadcast(broadcast.id)}
                              className="text-xs"
                            >
                              {broadcast.is_active ? "Deaktivieren" : "Aktivieren"}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => deleteBroadcast(broadcast.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-gray-300 text-sm mb-2">{broadcast.message}</p>
                        <div className="text-xs text-gray-400">
                          Erstellt: {new Date(broadcast.created_at).toLocaleDateString('de-DE')}
                          {broadcast.last_broadcast && (
                            <span className="ml-4">
                              Letzter Broadcast: {new Date(broadcast.last_broadcast).toLocaleDateString('de-DE')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {broadcasts.length === 0 && (
                      <div className="text-center text-gray-400 py-4">
                        Keine Broadcasts erstellt.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Advertisements Tab */}
          <TabsContent value="ads" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Create Advertisement */}
              <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Werbung erstellen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-white">Titel</Label>
                    <Input 
                      value={adForm.title}
                      onChange={(e) => setAdForm({...adForm, title: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="Werbetitel eingeben..."
                    />
                  </div>
                  <div>
                    <Label className="text-white">Inhalt</Label>
                    <Textarea 
                      value={adForm.content}
                      onChange={(e) => setAdForm({...adForm, content: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white h-24"
                      placeholder="Werbeinhalt eingeben..."
                    />
                  </div>
                  <div>
                    <Label className="text-white">Link URL (optional)</Label>
                    <Input 
                      value={adForm.link_url}
                      onChange={(e) => setAdForm({...adForm, link_url: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="https://example.com"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Bild URL (optional)</Label>
                    <Input 
                      value={adForm.image_url}
                      onChange={(e) => setAdForm({...adForm, image_url: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Anzeigeort</Label>
                    <Select 
                      value={adForm.display_location} 
                      onValueChange={(value) => setAdForm({...adForm, display_location: value})}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="sidebar">Sidebar</SelectItem>
                        <SelectItem value="header">Header</SelectItem>
                        <SelectItem value="footer">Footer</SelectItem>
                        <SelectItem value="popup">Popup</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={createAdvertisement}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    disabled={!adForm.title || !adForm.content}
                  >
                    Werbung erstellen
                  </Button>
                </CardContent>
              </Card>

              {/* Advertisement List */}
              <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Aktive Werbungen</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {advertisements.map((ad) => (
                      <div key={ad.id} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-white font-medium">{ad.title}</h4>
                          <div className="flex space-x-2">
                            <Badge variant={ad.is_active ? "default" : "secondary"} className="text-xs">
                              {ad.is_active ? "Aktiv" : "Inaktiv"}
                            </Badge>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => deleteAdvertisement(ad.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-gray-300 text-sm mb-2">{ad.content}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-2">
                          <div>Ort: {ad.display_location}</div>
                          <div>Aufrufe: {ad.view_count}</div>
                          {ad.link_url && <div>Link: {ad.link_url}</div>}
                          {ad.end_date && <div>Endet: {new Date(ad.end_date).toLocaleDateString('de-DE')}</div>}
                        </div>
                        <div className="text-xs text-gray-400">
                          Erstellt: {new Date(ad.created_at).toLocaleDateString('de-DE')}
                        </div>
                      </div>
                    ))}
                    {advertisements.length === 0 && (
                      <div className="text-center text-gray-400 py-4">
                        Keine Werbungen erstellt.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white">System-Einstellungen</CardTitle>
                <CardDescription className="text-gray-300">
                  Konfigurieren Sie die Community-Einstellungen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-4 bg-slate-700/30 rounded-lg">
                    <h3 className="text-white font-medium mb-2">Broadcast-Nachrichten</h3>
                    <p className="text-gray-300 text-sm mb-4">
                      Automatische Nachrichten, die regelmäßig im Chat gesendet werden.
                    </p>
                    <Button className="bg-purple-600 hover:bg-purple-700">
                      Broadcast konfigurieren
                    </Button>
                  </div>
                  
                  <div className="p-4 bg-slate-700/30 rounded-lg">
                    <h3 className="text-white font-medium mb-2">Benutzergruppen</h3>
                    <p className="text-gray-300 text-sm mb-4">
                      Verwalten Sie Benutzergruppen und deren Berechtigungen.
                    </p>
                    <Button className="bg-purple-600 hover:bg-purple-700">
                      Gruppen verwalten
                    </Button>
                  </div>
                  
                  <div className="p-4 bg-slate-700/30 rounded-lg">
                    <h3 className="text-white font-medium mb-2">Werbung schalten</h3>
                    <p className="text-gray-300 text-sm mb-4">
                      Erstellen und verwalten Sie Werbeanzeigen für die Community.
                    </p>
                    <Button className="bg-purple-600 hover:bg-purple-700">
                      Werbung verwalten
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Broadcast Tab */}
          <TabsContent value="broadcast" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Create Broadcast */}
              <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Broadcast erstellen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-white">Nachricht</Label>
                    <Textarea 
                      value={broadcastForm.message}
                      onChange={(e) => setBroadcastForm({...broadcastForm, message: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white h-24"
                      placeholder="Broadcast-Nachricht eingeben..."
                    />
                  </div>
                  <div>
                    <Label className="text-white">Intervall (Minuten)</Label>
                    <Input 
                      type="number"
                      value={broadcastForm.interval_minutes}
                      onChange={(e) => setBroadcastForm({...broadcastForm, interval_minutes: parseInt(e.target.value) || 30})}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="30"
                      min="1"
                    />
                  </div>
                  <Button 
                    onClick={createBroadcast}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    disabled={!broadcastForm.message}
                  >
                    Broadcast erstellen
                  </Button>
                </CardContent>
              </Card>

              {/* Broadcast List */}
              <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Aktive Broadcasts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {broadcasts.map((broadcast) => (
                      <div key={broadcast.id} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-medium">
                              {broadcast.interval_minutes}min Intervall
                            </span>
                            <Badge variant={broadcast.is_active ? "default" : "secondary"} className="text-xs">
                              {broadcast.is_active ? "Aktiv" : "Inaktiv"}
                            </Badge>
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => toggleBroadcast(broadcast.id)}
                              className="text-xs"
                            >
                              {broadcast.is_active ? "Deaktivieren" : "Aktivieren"}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => deleteBroadcast(broadcast.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-gray-300 text-sm mb-2">{broadcast.message}</p>
                        <div className="text-xs text-gray-400">
                          Erstellt: {new Date(broadcast.created_at).toLocaleDateString('de-DE')}
                          {broadcast.last_broadcast && (
                            <span className="ml-4">
                              Letzter Broadcast: {new Date(broadcast.last_broadcast).toLocaleDateString('de-DE')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {broadcasts.length === 0 && (
                      <div className="text-center text-gray-400 py-4">
                        Keine Broadcasts erstellt.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Advertisements Tab */}
          <TabsContent value="ads" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Create Advertisement */}
              <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Werbung erstellen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-white">Titel</Label>
                    <Input 
                      value={adForm.title}
                      onChange={(e) => setAdForm({...adForm, title: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="Werbetitel eingeben..."
                    />
                  </div>
                  <div>
                    <Label className="text-white">Inhalt</Label>
                    <Textarea 
                      value={adForm.content}
                      onChange={(e) => setAdForm({...adForm, content: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white h-24"
                      placeholder="Werbeinhalt eingeben..."
                    />
                  </div>
                  <div>
                    <Label className="text-white">Link URL (optional)</Label>
                    <Input 
                      value={adForm.link_url}
                      onChange={(e) => setAdForm({...adForm, link_url: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="https://example.com"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Bild URL (optional)</Label>
                    <Input 
                      value={adForm.image_url}
                      onChange={(e) => setAdForm({...adForm, image_url: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Anzeigeort</Label>
                    <select 
                      value={adForm.display_location}
                      onChange={(e) => setAdForm({...adForm, display_location: e.target.value})}
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2"
                    >
                      <option value="sidebar">Sidebar</option>
                      <option value="header">Header</option>
                      <option value="footer">Footer</option>
                    </select>
                  </div>
                  <Button 
                    onClick={createAdvertisement}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    disabled={!adForm.title || !adForm.content}
                  >
                    Werbung erstellen
                  </Button>
                </CardContent>
              </Card>

              {/* Advertisements List */}
              <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Aktuelle Werbung</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {advertisements.map((ad) => (
                      <div key={ad.id} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-white font-medium">{ad.title}</h4>
                          <div className="flex space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {ad.display_location}
                            </Badge>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => deleteAdvertisement(ad.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-gray-300 text-sm mb-2">{ad.content}</p>
                        {ad.link_url && (
                          <a 
                            href={ad.link_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 text-sm"
                          >
                            {ad.link_url}
                          </a>
                        )}
                        <div className="text-xs text-gray-400 mt-2">
                          <div>Erstellt: {new Date(ad.created_at).toLocaleDateString('de-DE')}</div>
                          <div>Aufrufe: {ad.view_count} | Klicks: {ad.click_count}</div>
                        </div>
                      </div>
                    ))}
                    {advertisements.length === 0 && (
                      <div className="text-center text-gray-400 py-4">
                        Keine Werbung erstellt.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;