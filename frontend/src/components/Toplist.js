import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  Trophy, 
  Medal, 
  Award, 
  Crown, 
  Star,
  TrendingUp,
  Calendar,
  Users,
  MessageSquare,
  MessageCircle,
  Clock,
  Filter
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Toplist = () => {
  const [toplistData, setToplistData] = useState([]);
  const [toplistStats, setToplistStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState({
    time_period: "all_time",
    category: "all",
    limit: 50,
    user_role: null,
    min_points: null
  });

  useEffect(() => {
    fetchToplistData();
    fetchToplistStats();
  }, [activeFilter]);

  const fetchToplistData = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API}/toplist/advanced`, activeFilter);
      setToplistData(response.data);
    } catch (error) {
      console.error('Error fetching toplist data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchToplistStats = async () => {
    try {
      const response = await axios.get(`${API}/toplist/stats`);
      setToplistStats(response.data);
    } catch (error) {
      console.error('Error fetching toplist stats:', error);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Award className="w-6 h-6 text-orange-500" />;
    return <span className="w-6 h-6 flex items-center justify-center text-purple-300 font-bold">#{rank}</span>;
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'superuser_admin': return 'bg-red-600';
      case 'superuser_vip': return 'bg-purple-600';
      case 'forum_moderator': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  const formatTimePeriod = (period) => {
    switch (period) {
      case 'today': return 'Heute';
      case 'this_week': return 'Diese Woche';
      case 'this_month': return 'Dieser Monat';
      case 'all_time': return 'Alle Zeit';
      default: return period;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Trophy className="w-10 h-10 text-yellow-500" />
            <h1 className="text-4xl font-bold text-white">RichComm Toplist</h1>
            <Trophy className="w-10 h-10 text-yellow-500" />
          </div>
          <p className="text-xl text-gray-300 mb-4">Die besten Mitglieder unserer Community</p>
          
          {/* Back to Dashboard Button */}
          <Button 
            onClick={() => window.location.href = '/community'}
            className="mb-4 bg-purple-600 hover:bg-purple-700"
          >
            🏠 Zurück zum Dashboard
          </Button>
        </div>

        {/* Stats Overview */}
        {toplistStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{toplistStats.total_users}</p>
                <p className="text-gray-300">Mitglieder</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
              <CardContent className="p-6 text-center">
                <Clock className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{toplistStats.active_users_today}</p>
                <p className="text-gray-300">Heute aktiv</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
              <CardContent className="p-6 text-center">
                <Star className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{toplistStats.total_points_distributed}</p>
                <p className="text-gray-300">Punkte vergeben</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
              <CardContent className="p-6 text-center">
                <TrendingUp className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">
                  {toplistStats.top_earner_today ? toplistStats.top_earner_today.points_today : 0}
                </p>
                <p className="text-gray-300">Top heute</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter Section */}
        <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filter & Kategorien
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-white">Zeitraum</Label>
                <Select
                  value={activeFilter.time_period}
                  onValueChange={(value) => setActiveFilter({...activeFilter, time_period: value})}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="all_time">Alle Zeit</SelectItem>
                    <SelectItem value="this_month">Dieser Monat</SelectItem>
                    <SelectItem value="this_week">Diese Woche</SelectItem>
                    <SelectItem value="today">Heute</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white">Kategorie</Label>
                <Select
                  value={activeFilter.category}
                  onValueChange={(value) => setActiveFilter({...activeFilter, category: value})}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="forum">Forum</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                    <SelectItem value="guestbook">Gästebuch</SelectItem>
                    <SelectItem value="daily_activity">Tägliche Aktivität</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white">Rolle</Label>
                <Select
                  value={activeFilter.user_role || "all"}
                  onValueChange={(value) => setActiveFilter({...activeFilter, user_role: value === "all" ? null : value})}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="all">Alle Rollen</SelectItem>
                    <SelectItem value="superuser_admin">Admins</SelectItem>
                    <SelectItem value="superuser_vip">VIPs</SelectItem>
                    <SelectItem value="forum_moderator">Moderatoren</SelectItem>
                    <SelectItem value="user">Benutzer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white">Min. Punkte</Label>
                <Input
                  type="number"
                  value={activeFilter.min_points || ''}
                  onChange={(e) => setActiveFilter({...activeFilter, min_points: e.target.value ? parseInt(e.target.value) : null})}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="z.B. 100"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Toplist */}
        <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>Toplist - {formatTimePeriod(activeFilter.time_period)}</span>
              <Badge variant="secondary" className="bg-purple-600">
                {toplistData.length} Einträge
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                <p className="text-gray-300 mt-4">Lade Toplist...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {toplistData.map((entry, index) => (
                  <div
                    key={entry.user_id}
                    className={`p-4 rounded-lg border ${
                      entry.rank <= 3 
                        ? 'bg-gradient-to-r from-yellow-900/20 to-purple-900/20 border-yellow-500/30' 
                        : 'bg-slate-700/30 border-slate-600/30'
                    } hover:bg-slate-600/30 transition-colors`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {getRankIcon(entry.rank)}
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-white font-medium">{entry.username}</h3>
                            {entry.is_vip && <Crown className="w-4 h-4 text-yellow-500" />}
                            <Badge className={`${getRoleColor(entry.role)} text-white text-xs`}>
                              {entry.role === 'superuser_admin' ? 'Admin' :
                               entry.role === 'superuser_vip' ? 'VIP' :
                               entry.role === 'forum_moderator' ? 'Moderator' : 'User'}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
                            <span>📅 {entry.days_active} Tage dabei</span>
                            <span>💬 {entry.forum_posts} Posts</span>
                            <span>🧵 {entry.forum_threads} Threads</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-purple-300">{entry.points}</p>
                        <p className="text-sm text-gray-400">Punkte</p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                          <span>↗️ {entry.total_earned}</span>
                          <span>↘️ {entry.total_spent}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {toplistData.length === 0 && (
                  <div className="text-center py-8">
                    <Trophy className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">Keine Einträge für diese Filter gefunden</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Toplist;