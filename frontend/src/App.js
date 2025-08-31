import React, { useState, useEffect, useContext } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Badge } from "./components/ui/badge";
import { Users, MessageCircle, Crown, Star, Clock, TrendingUp, Settings, Search, User, Shield, Bell, MessageSquare } from "lucide-react";
import AdminPanel from "./components/AdminPanel";
import UserProfile from "./components/UserProfile";
import UserSearch from "./components/UserSearch";
import Forum, { ForumOverview, ForumTopic } from "./components/Forum";
import ForumThread from "./components/ForumThread";
import Chat from "./components/Chat";
import Toplist from "./components/Toplist";
import Messages from "./components/Messages";
import Friends from "./components/Friends";
import Notifications from "./components/Notifications";
import HelpPopup from "./components/HelpPopup";
import ChatPolling from "./components/ChatPolling";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Authentication Context
const AuthContext = React.createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        
        // Try to get user data from dashboard to validate token
        try {
          const dashboardResponse = await axios.get(`${API}/community/dashboard`);
          if (dashboardResponse.data && dashboardResponse.data.user) {
            setUser(dashboardResponse.data.user);
          }
        } catch (error) {
          // Token is invalid, remove it
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { username, password });
      const { access_token, user: userData } = response.data;
      
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Login fehlgeschlagen' };
    }
  };

  const register = async (username, email, password) => {
    try {
      await axios.post(`${API}/auth/register`, { username, email, password });
      return await login(username, password);
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Registrierung fehlgeschlagen' };
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`);
    } catch (error) {
      console.log('Logout error:', error);
    }
    
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Login Component
const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/community', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = isLogin 
      ? await login(formData.username, formData.password)
      : await register(formData.username, formData.email, formData.password);

    if (result.success) {
      // Successful login, navigation will happen via useEffect
      console.log('Login successful, redirecting...');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%224%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
      
      <Card className="w-full max-w-md bg-slate-800/90 backdrop-blur-xl border-purple-500/20 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-32 h-32 rounded-full bg-gradient-to-r from-cyan-400 to-purple-600 p-1">
            <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center">
              <img 
                src="https://customer-assets.emergentagent.com/job_5ba04720-db17-48b8-8101-dbcf545b8a6e/artifacts/ccamkv3h_richenterlogoEMOTE112.png" 
                alt="RichComm Logo" 
                className="w-24 h-24 object-contain"
              />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent">
              RichComm Community
            </CardTitle>
            <CardDescription className="text-gray-300">
              {isLogin ? 'Willkommen zurück!' : 'Tritt der Community bei!'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Benutzername"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="bg-slate-700/50 border-slate-600 text-white placeholder-gray-400 focus:border-purple-500"
                required
              />
            </div>
            
            {!isLogin && (
              <div>
                <Input
                  type="email"
                  placeholder="E-Mail"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder-gray-400 focus:border-purple-500"
                  required
                />
              </div>
            )}
            
            <div>
              <Input
                type="password"
                placeholder="Passwort"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="bg-slate-700/50 border-slate-600 text-white placeholder-gray-400 focus:border-purple-500"
                required
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded border border-red-500/20">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-semibold"
              disabled={loading}
            >
              {loading ? 'Lädt...' : (isLogin ? 'Anmelden' : 'Registrieren')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => setIsLogin(!isLogin)}
              className="text-purple-400 hover:text-purple-300"
            >
              {isLogin ? 'Noch kein Account? Registrieren' : 'Bereits registriert? Anmelden'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Community Dashboard Component
const CommunityDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [onlineStats, setOnlineStats] = useState(null);
  const [activeBroadcasts, setActiveBroadcasts] = useState([]);
  const [activeAds, setActiveAds] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [broadcastTimeout, setBroadcastTimeout] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
    
    // Setup real-time updates for online stats and heartbeat
    const onlineStatsInterval = setInterval(async () => {
      try {
        // Update online stats
        const onlineRes = await axios.get(`${API}/community/online-stats`);
        setOnlineStats(onlineRes.data);
        
        // Send heartbeat to keep user online (update last_seen)
        await axios.put(`${API}/users/heartbeat`);
        
        // Update notifications
        try {
          const notificationsRes = await axios.get(`${API}/notifications/personal`);
          setNotifications(notificationsRes.data);
        } catch (error) {
          console.error('Error fetching notifications:', error);
        }
        
        // Also update broadcasts (check for expired ones)
        if (user && (user.role === 'superuser_admin' || user.role === 'superuser_vip')) {
          const broadcastsRes = await axios.get(`${API}/broadcasts/active`);
          setActiveBroadcasts(broadcastsRes.data);
        }
      } catch (error) {
        console.error('Error updating online stats:', error);
      }
    }, 30000); // Update every 30 seconds

    return () => {
      clearInterval(onlineStatsInterval);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [dashboardRes, onlineRes, adsRes] = await Promise.all([
        axios.get(`${API}/community/dashboard`),
        axios.get(`${API}/community/online-stats`),
        axios.get(`${API}/advertisements?location=sidebar`)
      ]);
      setDashboardData(dashboardRes.data);
      setOnlineStats(onlineRes.data);
      setActiveAds(adsRes.data);
      
      // Get active broadcasts (with auto-hide logic)
      if (dashboardRes.data.user?.role === 'superuser_admin' || dashboardRes.data.user?.role === 'superuser_vip') {
        try {
          const broadcastsRes = await axios.get(`${API}/broadcasts/active`);
          setActiveBroadcasts(broadcastsRes.data);
        } catch (error) {
          console.log('Could not fetch broadcasts:', error);
        }
      }
      
      // Get notifications
      try {
        const notificationsRes = await axios.get(`${API}/notifications/personal`);
        setNotifications(notificationsRes.data);
      } catch (error) {
        console.log('Could not fetch notifications:', error);
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'superuser_admin': return 'SUPERUSER ADMIN';
      case 'superuser_vip': return 'SUPERUSER VIP';
      case 'superuser': return 'SUPERUSER';
      default: return 'USER';
    }
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'superuser_admin': return 'destructive';
      case 'superuser_vip': return 'default';
      case 'superuser': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Lade Community...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-purple-500/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img 
              src="https://customer-assets.emergentagent.com/job_5ba04720-db17-48b8-8101-dbcf545b8a6e/artifacts/ccamkv3h_richenterlogoEMOTE112.png" 
              alt="RichComm Logo" 
              className="w-10 h-10 object-contain"
            />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent">
              RichComm Community
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-white font-semibold">{user?.username}</div>
              <div className="text-sm">
                <Badge variant={getRoleBadgeVariant(user?.role)} className="text-xs">
                  {getRoleDisplayName(user?.role)}
                </Badge>
              </div>
            </div>
            <Button 
              onClick={() => window.location.href = `/profile/${user?.username}`}
              variant="outline" 
              className="border-purple-500/20 text-purple-300 hover:bg-purple-500/10"
            >
              <User className="w-4 h-4 mr-2" />
              Profil
            </Button>
            <Button 
              onClick={() => navigate('/notifications')}
              variant="outline" 
              className="border-purple-500/20 text-purple-300 hover:bg-purple-500/10 relative"
            >
              <Bell className="w-4 h-4 mr-2" />
              Benachrichtigungen
              {notifications?.filter(n => !n.is_read).length > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notifications.filter(n => !n.is_read).length}
                </span>
              )}
            </Button>
            <Button 
              onClick={() => window.location.href = '/search'}
              variant="outline" 
              className="border-purple-500/20 text-purple-300 hover:bg-purple-500/10"
            >
              <Search className="w-4 h-4 mr-2" />
              Suchen
            </Button>
            {(user?.role === 'superuser_admin' || user?.role === 'superuser_vip') && (
              <Button 
                onClick={() => window.location.href = '/admin'}
                variant="outline" 
                className="border-purple-500/20 text-purple-300 hover:bg-purple-500/10"
              >
                <Settings className="w-4 h-4 mr-2" />
                Admin
              </Button>
            )}
            <HelpPopup 
              trigger={
                <Button 
                  variant="ghost"
                  className="bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 text-yellow-400"
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Hilfe
                </Button>
              }
            />
            <Button 
              onClick={logout}
              variant="outline" 
              className="border-purple-500/20 text-purple-300 hover:bg-purple-500/10"
            >
              Abmelden
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">


        {/* Active Broadcasts - Only show latest one */}
        {activeBroadcasts.length > 0 && (
          <div className="mb-6">
            <Card className="bg-gradient-to-r from-red-900/50 to-purple-900/50 border-red-500/30">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <div className="flex-1">
                    <h3 className="text-red-300 font-medium">📢 System-Nachricht</h3>
                    <p className="text-white">{activeBroadcasts[activeBroadcasts.length - 1].message}</p>
                  </div>
                  <span className="text-red-400 text-sm">
                    {new Date(activeBroadcasts[activeBroadcasts.length - 1].created_at).toLocaleTimeString('de-DE')}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Online Users & VIPs */}
          <div className="space-y-6">
            {/* Online VIPs */}
            <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-purple-300">
                  <Crown className="w-5 h-5" />
                  <span>Online VIPs ({onlineStats?.online_vips?.length || 0})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {onlineStats?.online_vips?.length > 0 ? (
                    onlineStats.online_vips.map((vip, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-slate-700/30 rounded">
                        <span 
                          className="text-white cursor-pointer hover:text-purple-300 transition-colors"
                          onClick={() => window.location.href = `/profile/${vip.username}`}
                        >
                          {vip.username} {vip.current_room && <span className="text-purple-300">(c)</span>}
                        </span>
                        <Badge variant="default" className="text-xs">
                          VIP
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-400 text-center py-4">Keine VIPs online</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Online Forum Moderators */}
            {onlineStats?.online_forum_moderators?.length > 0 && (
              <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-green-300">
                    <Shield className="w-5 h-5" />
                    <span>Online Forum Moderatoren ({onlineStats.online_forum_moderators.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {onlineStats.online_forum_moderators.map((mod, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-slate-700/30 rounded">
                        <span 
                          className="text-white cursor-pointer hover:text-green-300 transition-colors"
                          onClick={() => window.location.href = `/profile/${mod.username}`}
                        >
                          {mod.username}
                          {mod.current_room && <span className="text-gray-400 text-sm ml-2">({mod.current_room})</span>}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          MODERATOR
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Online Admins */}
            {onlineStats?.online_admins?.length > 0 && (
              <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-red-300">
                    <Crown className="w-5 h-5" />
                    <span>Online Admins ({onlineStats.online_admins.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {onlineStats.online_admins.map((admin, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-slate-700/30 rounded">
                        <span 
                          className="text-white cursor-pointer hover:text-red-300 transition-colors"
                          onClick={() => window.location.href = `/profile/${admin.username}`}
                        >
                          {admin.username}
                          {admin.current_room && <span className="text-gray-400 text-sm ml-2">({admin.current_room})</span>}
                        </span>
                        <Badge variant="destructive" className="text-xs">
                          ADMIN
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Regular Online Users */}
            <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-cyan-300">
                  <Users className="w-5 h-5" />
                  <span>Online Benutzer ({onlineStats?.online_users?.length || 0})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {onlineStats?.online_users?.length > 0 ? (
                    onlineStats.online_users.map((user, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-slate-700/30 rounded">
                        <span 
                          className="text-white cursor-pointer hover:text-cyan-300 transition-colors"
                          onClick={() => window.location.href = `/profile/${user.username}`}
                        >
                          {user.username}
                          {user.current_room && <span className="text-gray-400 text-sm ml-2">({user.current_room})</span>}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          USER
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-400 text-center py-4">Keine regulären Benutzer online</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Chat Rooms */}
          <div>
            <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-green-300">
                  <MessageCircle className="w-5 h-5" />
                  <span>Chat Räume</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData?.chat_rooms?.map((room, index) => (
                    <div key={index} className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">
                          {room.name} {room.is_private && <span className="text-red-400">(geschlossen)</span>}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {room.users?.length || 0} User
                        </Badge>
                      </div>
                      {room.users && room.users.length > 0 && (
                        <div className="mt-2 text-sm text-gray-400">
                          {room.users.slice(0, 3).join(', ')}
                          {room.users.length > 3 && ` +${room.users.length - 3} weitere`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - News & Ads */}
          <div className="space-y-6">
            {/* Werbung Sidebar */}
            {activeAds.length > 0 && (
              <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-yellow-300">
                    <Star className="w-5 h-5" />
                    <span>Werbung</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activeAds.map((ad) => (
                      <div key={ad.id} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                        <h4 className="text-white font-medium mb-2">{ad.title}</h4>
                        <p className="text-gray-300 text-sm mb-3">{ad.content}</p>
                        {ad.link_url && (
                          <a 
                            href={ad.link_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 text-sm underline"
                            onClick={() => {
                              // Track click
                              axios.post(`${API}/advertisements/${ad.id}/click`).catch(e => console.log(e));
                            }}
                          >
                            Mehr erfahren →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-yellow-300">
                  <TrendingUp className="w-5 h-5" />
                  <span>Meine Stats</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Punkte:</span>
                    <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                      {user?.points || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Rolle:</span>
                    <Badge variant={getRoleBadgeVariant(user?.role)}>
                      {getRoleDisplayName(user?.role)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Mitglied seit:</span>
                    <span className="text-white text-sm">
                      {user?.joined_date ? new Date(user.joined_date).toLocaleDateString('de-DE') : 'Unbekannt'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Online:</span>
                    <span className="text-white text-sm">
                      {onlineStats?.total_online || 0} Benutzer
                    </span>
                  </div>
                  
                  {/* Help Page Link */}
                  <div className="pt-3 border-t border-slate-600/30">
                    <button
                      onClick={() => window.open('/static/rich-chat.html?open=help', '_blank')}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Hilfe & Chat-Befehle
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* News */}
            <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-blue-300">
                  <Star className="w-5 h-5" />
                  <span>Community News</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData?.news?.length > 0 ? (
                    dashboardData.news.map((newsItem, index) => (
                      <div key={index} className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                        <h4 className="text-white font-medium mb-1">{newsItem.title}</h4>
                        <p className="text-gray-300 text-sm mb-2">{newsItem.content}</p>
                        <div className="flex items-center space-x-2 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(newsItem.created_at).toLocaleDateString('de-DE')}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-400 text-center py-4">Keine aktuellen News</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navigation Tabs - Updated with active Chat */}
        <div className="mt-8">
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full grid-cols-9 bg-slate-800/60 border border-purple-500/20">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-purple-600">Dashboard</TabsTrigger>
              <TabsTrigger 
                value="search" 
                className="data-[state=active]:bg-purple-600"
                onClick={() => window.location.href = '/search'}
              >
                Benutzersuche
              </TabsTrigger>
              <TabsTrigger 
                value="forum" 
                className="data-[state=active]:bg-purple-600"
                onClick={() => window.location.href = '/forum'}
              >
                Forum
              </TabsTrigger>
              <TabsTrigger 
                value="chat" 
                className="data-[state=active]:bg-purple-600"
                onClick={() => window.open('/static/rich-chat.html', '_blank')}
              >
                RichChat
              </TabsTrigger>
              <TabsTrigger 
                value="messages" 
                className="data-[state=active]:bg-purple-600"
                onClick={() => window.location.href = '/messages'}
              >
                Nachrichten
              </TabsTrigger>
              <TabsTrigger 
                value="friends" 
                className="data-[state=active]:bg-purple-600"
                onClick={() => window.location.href = '/friends'}
              >
                Freunde
              </TabsTrigger>
              <TabsTrigger 
                value="toplist" 
                className="data-[state=active]:bg-purple-600"
                onClick={() => navigate('/toplist')}
              >
                Toplist
              </TabsTrigger>
              {user.role === 'superuser_admin' && (
                <TabsTrigger 
                  value="admin" 
                  className="data-[state=active]:bg-purple-600"
                  onClick={() => window.location.href = '/admin'}
                >
                  Admin Panel
                </TabsTrigger>
              )}
              <TabsTrigger 
                value="profile" 
                className="data-[state=active]:bg-purple-600"
                onClick={() => window.location.href = `/profile/${user.username}`}
              >
                Mein Profil
              </TabsTrigger>
            </TabsList>
            <TabsContent value="dashboard" className="mt-6">
              <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
                <CardContent className="p-6">
                  <div className="text-center text-gray-300">
                    <h3 className="text-xl font-semibold mb-2">Community Dashboard</h3>
                    <p>Verwalte deine Aktivitäten und entdecke neue Freunde in der RichComm Community!</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

// Messages and Friends Wrappers
const MessagesWrapper = () => {
  const { user } = useAuth();
  return <Messages currentUser={user} />;
};

const FriendsWrapper = () => {
  const { user } = useAuth();
  return <Friends currentUser={user} />;
};

const NotificationsWrapper = () => {
  const { user } = useAuth();
  return <Notifications currentUser={user} />;
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/community" element={<ProtectedRoute><CommunityDashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminPanel /></AdminRoute></ProtectedRoute>} />
          <Route path="/profile/:username" element={<ProtectedRoute><UserProfileWrapper /></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute><UserSearch /></ProtectedRoute>} />
          <Route path="/forum" element={<ProtectedRoute><ForumWrapper /></ProtectedRoute>} />
          <Route path="/forum/topics/:topicId" element={<ProtectedRoute><ForumTopicWrapper /></ProtectedRoute>} />
          <Route path="/forum/threads/:threadId" element={<ProtectedRoute><ForumThreadWrapper /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatWrapper /></ProtectedRoute>} />
          <Route path="/chat-polling" element={<ProtectedRoute><ChatPollingWrapper /></ProtectedRoute>} />
          <Route path="/rich-chat" element={<ProtectedRoute><RichChatWrapper /></ProtectedRoute>} />
          <Route path="/toplist" element={<ProtectedRoute><Toplist /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><MessagesWrapper /></ProtectedRoute>} />
          <Route path="/friends" element={<ProtectedRoute><FriendsWrapper /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsWrapper /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/community" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

// Forum Wrappers to pass current user
const ForumWrapper = () => {
  const { user } = useAuth();
  return <ForumOverview currentUser={user} />;
};

const ForumTopicWrapper = () => {
  const { user } = useAuth();
  return <ForumTopic currentUser={user} />;
};

const ForumThreadWrapper = () => {
  const { user } = useAuth();
  return <ForumThread currentUser={user} />;
};

const ChatWrapper = () => {
  const { user } = useAuth();
  return <Chat currentUser={user} />;
};

const ChatPollingWrapper = () => {
  const { user } = useAuth();
  return <ChatPolling currentUser={user} />;
};

const RichChatWrapper = () => {
  const { user } = useAuth();
  
  useEffect(() => {
    // Copy auth token to help RichChat authenticate
    if (user) {
      const token = localStorage.getItem('token');
      if (token) {
        // Make sure RichChat can access the token
        window.postMessage({ type: 'SET_TOKEN', token }, '*');
      }
    }
  }, [user]);

  // Serve RichChat via data URL to bypass routing issues
  const richChatHTML = `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RichComm NetCommunity Chat</title>
    <script>
        // Pass backend URL to JavaScript
        window.REACT_APP_BACKEND_URL = '${BACKEND_URL}';
        // Get token from parent window
        window.addEventListener('message', function(event) {
            if (event.data.type === 'SET_TOKEN') {
                localStorage.setItem('token', event.data.token);
            }
        });
        // Try to get token from parent immediately
        if (window.parent !== window) {
            const token = window.parent.localStorage.getItem('token');
            if (token) {
                localStorage.setItem('token', token);
            }
        }
    </script>
    <style>
        body { margin: 0; padding: 0; overflow: hidden; }
        iframe { width: 100vw; height: 100vh; border: none; }
    </style>
</head>
<body>
    <iframe src="/static/rich-chat.html" style="width: 100%; height: 100vh; border: none;"></iframe>
</body>
</html>`;

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      <iframe 
        srcDoc={richChatHTML}
        style={{ 
          width: '100%', 
          height: '100%', 
          border: 'none',
          margin: 0,
          padding: 0
        }}
        title="RichComm Chat"
      />
    </div>
  );
};

// User Profile Wrapper to pass current user
const UserProfileWrapper = () => {
  const { user } = useAuth();
  return <UserProfile currentUser={user} />;
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Lädt...</div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" replace />;
};

// Admin Route Component  
const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  
  if (!user || (user.role !== 'superuser_admin' && user.role !== 'superuser_vip')) {
    return <Navigate to="/community" replace />;
  }
  
  return children;
};

export default App;