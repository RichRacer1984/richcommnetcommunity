import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { 
  ArrowLeft,
  Clock, 
  User,
  Edit,
  Trash2,
  Reply,
  Flag,
  Pin,
  Lock,
  Unlock,
  Crown,
  Shield,
  MessageCircle
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ForumThread = ({ currentUser }) => {
  const { threadId } = useParams();
  const [threadData, setThreadData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadThreadData();
  }, [threadId]);

  const loadThreadData = async () => {
    try {
      const response = await axios.get(`${API}/forum/threads/${threadId}/posts`);
      setThreadData(response.data.thread);
      setPosts(response.data.posts);
    } catch (error) {
      console.error('Error loading thread data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPost = async () => {
    if (!replyContent.trim()) return;

    try {
      await axios.post(`${API}/forum/posts`, {
        thread_id: threadId,
        content: replyContent,
        parent_post_id: replyingTo
      });
      
      setReplyContent('');
      setReplyingTo(null);
      loadThreadData();
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const deletePost = async (postId) => {
    try {
      await axios.delete(`${API}/admin/forum/posts/${postId}`);
      loadThreadData();
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const deleteThread = async () => {
    try {
      await axios.delete(`${API}/admin/forum/threads/${threadId}`);
      navigate(`/forum/topics/${threadData.topic_id}`);
    } catch (error) {
      console.error('Error deleting thread:', error);
    }
  };

  const toggleThreadPin = async () => {
    try {
      await axios.put(`${API}/admin/forum/threads/${threadId}/pin`);
      loadThreadData();
    } catch (error) {
      console.error('Error toggling thread pin:', error);
    }
  };

  const toggleThreadLock = async () => {
    try {
      await axios.put(`${API}/admin/forum/threads/${threadId}/lock`);
      loadThreadData();
    } catch (error) {
      console.error('Error toggling thread lock:', error);
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

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'superuser_admin': return 'destructive';
      case 'superuser_vip': return 'default';
      case 'forum_moderator': return 'secondary';
      default: return 'outline';
    }
  };

  const canModerate = () => {
    return currentUser.role === 'superuser_admin' || 
           currentUser.role === 'superuser_vip' || 
           currentUser.role === 'forum_moderator';
  };

  const canDeleteThread = () => {
    return currentUser.role === 'superuser_admin' || 
           currentUser.role === 'superuser_vip';
  };

  const canPost = () => {
    return currentUser.role !== 'banned' && (!threadData?.is_locked || canModerate());
  };

  const canDeletePost = (post) => {
    return post.author_id === currentUser.id || canModerate();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Lade Thread...</div>
      </div>
    );
  }

  if (!threadData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Thread nicht gefunden</h2>
            <p className="text-gray-300">Dieser Thread existiert nicht oder wurde gelöscht.</p>
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
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button 
            onClick={() => navigate(`/forum/topics/${threadData.topic_id}`)}
            variant="ghost"
            className="mb-4 text-purple-300 hover:text-purple-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück zum Forum-Bereich
          </Button>
          
          <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {threadData.is_pinned && <Pin className="w-5 h-5 text-yellow-400" />}
                    {threadData.is_locked && <Lock className="w-5 h-5 text-red-400" />}
                    
                    <h1 className="text-2xl font-bold text-white">{threadData.title}</h1>
                    
                    {threadData.is_pinned && (
                      <Badge variant="secondary" className="text-xs">
                        Angepinnt
                      </Badge>
                    )}
                    {threadData.is_locked && (
                      <Badge variant="destructive" className="text-xs">
                        Gesperrt
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-400">
                    <div className="flex items-center space-x-1">
                      <User className="w-4 h-4" />
                      <span>Erstellt von:</span>
                      <span className="text-purple-300">{threadData.author_name}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageCircle className="w-4 h-4" />
                      <span>{threadData.post_count} Beiträge</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{new Date(threadData.created_at).toLocaleString('de-DE')}</span>
                    </div>
                  </div>
                </div>
                
                {canModerate() && (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleThreadPin}
                      className="border-yellow-500/20 text-yellow-300 hover:bg-yellow-500/10"
                    >
                      <Pin className="w-4 h-4 mr-2" />
                      {threadData.is_pinned ? 'Entpinnen' : 'Anpinnen'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleThreadLock}
                      className={`border-red-500/20 text-red-300 hover:bg-red-500/10`}
                    >
                      {threadData.is_locked ? (
                        <>
                          <Unlock className="w-4 h-4 mr-2" />
                          Entsperren
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Sperren
                        </>
                      )}
                    </Button>
                    {canDeleteThread() && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-600/20 text-red-400 hover:bg-red-600/10"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Thread löschen
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-800 border-purple-500/20">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">Thread löschen</AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-300">
                              Sind Sie sicher, dass Sie diesen Thread und alle seine Beiträge löschen möchten? 
                              Diese Aktion kann nicht rückgängig gemacht werden.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white">
                              Abbrechen
                            </AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={deleteThread}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Thread löschen
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Posts */}
        <div className="space-y-6">
          {posts.filter(post => !post.is_deleted).map((post, index) => (
            <Card key={post.id} className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  {/* User Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-400 to-purple-600 flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  
                  {/* Post Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="font-semibold text-white">{post.author_name}</span>
                        <Badge variant={getRoleBadgeVariant(currentUser.role)} className="text-xs">
                          {getRoleDisplayName(currentUser.role)}
                        </Badge>
                        {index === 0 && (
                          <Badge variant="outline" className="text-xs text-blue-300 border-blue-300">
                            Thread-Ersteller
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <span>#{index + 1}</span>
                        <span>•</span>
                        <Clock className="w-4 h-4" />
                        <span>{new Date(post.created_at).toLocaleString('de-DE')}</span>
                      </div>
                    </div>
                    
                    <div className="prose prose-invert max-w-none mb-4">
                      <div className="text-gray-300 whitespace-pre-wrap">{post.content}</div>
                    </div>
                    
                    {post.is_edited && (
                      <div className="text-xs text-gray-500 mb-3">
                        <Edit className="w-3 h-3 inline mr-1" />
                        Zuletzt bearbeitet: {new Date(post.updated_at).toLocaleString('de-DE')}
                      </div>
                    )}
                    
                    {/* Post Actions */}
                    <div className="flex items-center space-x-4">
                      {canPost() && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReplyingTo(post.id);
                            document.getElementById('reply-form')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="text-purple-300 hover:text-purple-200 hover:bg-purple-500/10"
                        >
                          <Reply className="w-4 h-4 mr-1" />
                          Antworten
                        </Button>
                      )}
                      
                      {canDeletePost(post) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-300 hover:text-red-200 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Löschen
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-slate-800 border-purple-500/20">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white">Beitrag löschen</AlertDialogTitle>
                              <AlertDialogDescription className="text-gray-300">
                                Sind Sie sicher, dass Sie diesen Beitrag löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white">
                                Abbrechen
                              </AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deletePost(post.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Löschen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Reply Form */}
          {canPost() && (
            <Card id="reply-form" className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Reply className="w-5 h-5 mr-2" />
                  {replyingTo ? 'Auf Beitrag antworten' : 'Neuen Beitrag schreiben'}
                </CardTitle>
                {replyingTo && (
                  <CardDescription className="text-gray-300">
                    Sie antworten auf einen Beitrag in diesem Thread.
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyingTo(null)}
                      className="ml-2 text-purple-300 hover:text-purple-200"
                    >
                      Abbrechen
                    </Button>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-white">Ihr Beitrag</Label>
                    <Textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white h-32"
                      placeholder="Schreiben Sie Ihren Beitrag..."
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      onClick={createPost}
                      className="bg-purple-600 hover:bg-purple-700"
                      disabled={!replyContent.trim()}
                    >
                      Beitrag senden
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setReplyContent('');
                        setReplyingTo(null);
                      }}
                      className="border-slate-600"
                    >
                      Zurücksetzen
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!canPost() && threadData.is_locked && (
            <Card className="bg-slate-800/60 backdrop-blur-sm border-red-500/20">
              <CardContent className="p-6 text-center">
                <Lock className="w-12 h-12 mx-auto mb-4 text-red-400" />
                <h3 className="text-lg font-semibold text-white mb-2">Thread gesperrt</h3>
                <p className="text-gray-300">Dieser Thread wurde von einem Moderator gesperrt. Neue Beiträge sind nicht möglich.</p>
              </CardContent>
            </Card>
          )}

          {!canPost() && currentUser.role === 'banned' && (
            <Card className="bg-slate-800/60 backdrop-blur-sm border-red-500/20">
              <CardContent className="p-6 text-center">
                <Flag className="w-12 h-12 mx-auto mb-4 text-red-400" />
                <h3 className="text-lg font-semibold text-white mb-2">Schreibberechtigung entzogen</h3>
                <p className="text-gray-300">Sie können derzeit keine Beiträge verfassen.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForumThread;