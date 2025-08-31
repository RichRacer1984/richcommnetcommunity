import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { 
  MessageSquare, 
  Users, 
  Clock, 
  Pin, 
  Lock, 
  Unlock,
  Plus,
  ArrowLeft,
  Edit,
  Trash2,
  Flag,
  Eye,
  MessageCircle,
  Crown,
  Shield,
  MoreVertical
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Forum Overview Component - Shows all topics
const ForumOverview = ({ currentUser }) => {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    try {
      const response = await axios.get(`${API}/forum/topics`);
      setTopics(response.data);
    } catch (error) {
      console.error('Error loading topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'superuser_admin': return 'ADMIN';
      case 'superuser_vip': return 'VIP';
      case 'forum_moderator': return 'MODERATOR';
      default: return 'USER';
    }
  };

  const canAccessTopic = (topic) => {
    if (topic.is_public) return true;
    
    return currentUser.role === 'superuser_admin' || 
           currentUser.role === 'superuser_vip' ||
           currentUser.role === 'forum_moderator';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Lade Forum...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent mb-2">
                RichComm Forum
              </h1>
              <p className="text-gray-300">Community-Diskussionen und Themen</p>
            </div>
            <Button 
              onClick={() => navigate('/community')}
              variant="outline"
              className="border-purple-500/20 text-purple-300 hover:bg-purple-500/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück zur Community
            </Button>
          </div>
        </div>

        {/* Forum Topics */}
        <div className="space-y-4">
          {topics.map((topic) => {
            if (!canAccessTopic(topic)) return null;
            
            return (
              <Card 
                key={topic.id} 
                className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20 hover:bg-slate-800/80 transition-colors cursor-pointer"
                onClick={() => navigate(`/forum/topics/${topic.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <MessageSquare className="w-6 h-6 text-purple-400" />
                        <h3 className="text-xl font-semibold text-white">{topic.name}</h3>
                        {!topic.is_public && (
                          <Badge variant="secondary" className="text-xs">
                            <Shield className="w-3 h-3 mr-1" />
                            Privat
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-300 mb-3">{topic.description}</p>
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-400">
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="w-4 h-4" />
                          <span>{topic.thread_count || 0} Threads</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4" />
                          <span>{topic.post_count || 0} Beiträge</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>Erstellt: {new Date(topic.created_at).toLocaleDateString('de-DE')}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      <Badge 
                        variant={topic.is_public ? "outline" : "secondary"}
                        className="text-xs"
                      >
                        {topic.is_public ? "Öffentlich" : "Privat"}
                      </Badge>
                      
                      {(currentUser.role === 'superuser_admin' || currentUser.role === 'superuser_vip') && (
                        <Badge variant="destructive" className="text-xs">
                          <Crown className="w-3 h-3 mr-1" />
                          Verwaltung
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {topics.length === 0 && (
            <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
              <CardContent className="p-8 text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                <h3 className="text-xl font-semibold text-white mb-2">Keine Forum-Bereiche verfügbar</h3>
                <p className="text-gray-300">Es wurden noch keine Forum-Bereiche erstellt.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
            <CardContent className="p-6 text-center">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-cyan-400" />
              <div className="text-2xl font-bold text-white">{topics.length}</div>
              <div className="text-sm text-gray-400">Forum-Bereiche</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
            <CardContent className="p-6 text-center">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 text-purple-400" />
              <div className="text-2xl font-bold text-white">{topics.reduce((sum, topic) => sum + (topic.thread_count || 0), 0)}</div>
              <div className="text-sm text-gray-400">Gesamt Threads</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-green-400" />
              <div className="text-2xl font-bold text-white">{topics.reduce((sum, topic) => sum + (topic.post_count || 0), 0)}</div>
              <div className="text-sm text-gray-400">Gesamt Beiträge</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Topic View Component - Shows threads in a topic
const ForumTopic = ({ currentUser }) => {
  const { topicId } = useParams();
  const [topicData, setTopicData] = useState(null);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateThread, setShowCreateThread] = useState(false);
  const [newThread, setNewThread] = useState({ title: '', content: '' });
  const navigate = useNavigate();

  useEffect(() => {
    loadTopicData();
  }, [topicId]);

  const loadTopicData = async () => {
    try {
      const response = await axios.get(`${API}/forum/topics/${topicId}/threads`);
      setTopicData(response.data.topic);
      setThreads(response.data.threads);
    } catch (error) {
      console.error('Error loading topic data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createThread = async () => {
    if (!newThread.title.trim() || !newThread.content.trim()) {
      console.log('Validation failed:', { title: newThread.title, content: newThread.content });
      return;
    }

    try {
      console.log('Creating thread:', { topic_id: topicId, title: newThread.title, content: newThread.content });
      const response = await axios.post(`${API}/forum/threads`, {
        topic_id: topicId,
        title: newThread.title.trim(),
        content: newThread.content.trim()
      });
      
      console.log('Thread created successfully:', response.data);
      setNewThread({ title: '', content: '' });
      setShowCreateThread(false);
      loadTopicData();
    } catch (error) {
      console.error('Error creating thread:', error);
      // Show error to user
      alert('Fehler beim Erstellen des Threads: ' + (error.response?.data?.detail || error.message));
    }
  };

  const toggleThreadLock = async (threadId) => {
    try {
      await axios.put(`${API}/admin/forum/threads/${threadId}/lock`);
      loadTopicData();
    } catch (error) {
      console.error('Error toggling thread lock:', error);
    }
  };

  const toggleThreadPin = async (threadId) => {
    try {
      await axios.put(`${API}/admin/forum/threads/${threadId}/pin`);
      loadTopicData();
    } catch (error) {
      console.error('Error toggling thread pin:', error);
    }
  };

  const canModerate = () => {
    return currentUser.role === 'superuser_admin' || 
           currentUser.role === 'superuser_vip' || 
           currentUser.role === 'forum_moderator';
  };

  const canCreateThread = () => {
    return currentUser.role !== 'banned';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Lade Forum...</div>
      </div>
    );
  }

  if (!topicData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Forum-Bereich nicht gefunden</h2>
            <p className="text-gray-300">Dieser Forum-Bereich existiert nicht oder Sie haben keine Berechtigung.</p>
            <Button 
              onClick={() => navigate('/forum')}
              className="mt-4 bg-purple-600 hover:bg-purple-700"
            >
              Zurück zum Forum
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Button 
                onClick={() => navigate('/forum')}
                variant="ghost"
                className="mb-4 text-purple-300 hover:text-purple-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zurück zum Forum
              </Button>
              
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent mb-2">
                {topicData.name}
              </h1>
              <p className="text-gray-300">{topicData.description}</p>
              
              <div className="flex items-center space-x-4 mt-4 text-sm text-gray-400">
                <div className="flex items-center space-x-1">
                  <MessageCircle className="w-4 h-4" />
                  <span>{threads.length} Threads</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{topicData.post_count || 0} Beiträge</span>
                </div>
              </div>
            </div>
            
            {canCreateThread() && (
              <Dialog open={showCreateThread} onOpenChange={setShowCreateThread}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Neuer Thread
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-purple-500/20 max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-white">Neuen Thread erstellen</DialogTitle>
                    <DialogDescription className="text-gray-300">
                      Starten Sie eine neue Diskussion in {topicData.name}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-white">Thread-Titel</Label>
                      <Input
                        value={newThread.title}
                        onChange={(e) => setNewThread({...newThread, title: e.target.value})}
                        className="bg-slate-700 border-slate-600 text-white"
                        placeholder="Titel für Ihren Thread..."
                      />
                    </div>
                    <div>
                      <Label className="text-white">Erster Beitrag</Label>
                      <Textarea
                        value={newThread.content}
                        onChange={(e) => setNewThread({...newThread, content: e.target.value})}
                        className="bg-slate-700 border-slate-600 text-white h-32"
                        placeholder="Starten Sie die Diskussion..."
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        onClick={createThread}
                        className="bg-purple-600 hover:bg-purple-700"
                        disabled={!newThread.title.trim() || !newThread.content.trim()}
                      >
                        Thread erstellen
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowCreateThread(false)}
                        className="border-slate-600"
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Threads List */}
        <div className="space-y-4">
          {threads.map((thread) => (
            <Card 
              key={thread.id} 
              className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20 hover:bg-slate-800/80 transition-colors cursor-pointer"
              onClick={() => navigate(`/forum/threads/${thread.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {thread.is_pinned && <Pin className="w-4 h-4 text-yellow-400" />}
                      {thread.is_locked && <Lock className="w-4 h-4 text-red-400" />}
                      
                      <h3 className="text-lg font-semibold text-white hover:text-purple-300">
                        {thread.title}
                      </h3>
                      
                      {thread.is_pinned && (
                        <Badge variant="secondary" className="text-xs">
                          Angepinnt
                        </Badge>
                      )}
                      {thread.is_locked && (
                        <Badge variant="destructive" className="text-xs">
                          Gesperrt
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-400">
                      <div className="flex items-center space-x-1">
                        <span>Von:</span>
                        <span className="text-purple-300">{thread.author_name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="w-4 h-4" />
                        <span>{thread.post_count} Beiträge</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>Letzter Beitrag: {new Date(thread.last_post_at).toLocaleDateString('de-DE')}</span>
                      </div>
                      {thread.last_post_author && (
                        <div className="flex items-center space-x-1">
                          <span>von</span>
                          <span className="text-purple-300">{thread.last_post_author}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {canModerate() && (
                    <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleThreadPin(thread.id)}
                        className="text-yellow-400 hover:bg-yellow-500/10"
                      >
                        <Pin className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleThreadLock(thread.id)}
                        className="text-red-400 hover:bg-red-500/10"
                      >
                        {thread.is_locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {threads.length === 0 && (
            <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
              <CardContent className="p-8 text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                <h3 className="text-xl font-semibold text-white mb-2">Noch keine Threads</h3>
                <p className="text-gray-300 mb-4">Starten Sie die erste Diskussion in diesem Forum-Bereich.</p>
                {canCreateThread() && (
                  <Button 
                    onClick={() => setShowCreateThread(true)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ersten Thread erstellen
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

const Forum = ({ currentUser, view = 'overview' }) => {
  if (view === 'topic') {
    return <ForumTopic currentUser={currentUser} />;
  }
  
  return <ForumOverview currentUser={currentUser} />;
};

export default Forum;
export { ForumOverview, ForumTopic };