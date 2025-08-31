import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { 
  User, 
  MapPin, 
  Globe, 
  Calendar, 
  MessageSquare, 
  Edit, 
  Trash2, 
  Lock, 
  Unlock,
  Crown,
  Star,
  Clock,
  Key,
  Link2,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UserProfile = ({ currentUser }) => {
  const { username } = useParams();
  const [profileUser, setProfileUser] = useState(null);
  const [guestbookEntries, setGuestbookEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  
  // Form states
  const [profileForm, setProfileForm] = useState({
    bio: '',
    location: '',
    website: '',
    link1_name: '',
    link1_url: '',
    link2_name: '',
    link2_url: '',
    link3_name: '',
    link3_url: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [guestbookMessage, setGuestbookMessage] = useState('');
  const [isPrivateEntry, setIsPrivateEntry] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    try {
      const profileRes = await axios.get(`${API}/users/${username}/profile`);
      setProfileUser(profileRes.data);
      setIsOwnProfile(currentUser.username === username);
      
      if (profileRes.data.guestbook_open || currentUser.username === username) {
        const guestbookRes = await axios.get(`${API}/users/${username}/guestbook`);
        setGuestbookEntries(guestbookRes.data);
      }
      
      setProfileForm({
        bio: profileRes.data.bio || '',
        location: profileRes.data.location || '',
        website: profileRes.data.website || '',
        link1_name: profileRes.data.link1_name || '',
        link1_url: profileRes.data.link1_url || '',
        link2_name: profileRes.data.link2_name || '',
        link2_url: profileRes.data.link2_url || '',
        link3_name: profileRes.data.link3_name || '',
        link3_url: profileRes.data.link3_url || ''
      });
      
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    try {
      await axios.put(`${API}/users/profile`, profileForm);
      setEditingProfile(false);
      loadProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const changePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      alert('Neue Passwörter stimmen nicht überein');
      return;
    }

    try {
      await axios.put(`${API}/users/password`, {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      setChangingPassword(false);
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      alert('Passwort erfolgreich geändert');
    } catch (error) {
      console.error('Error changing password:', error);
      const errorMessage = error.response?.data?.detail || 'Fehler beim Ändern des Passworts';
      alert(errorMessage);
    }
  };

  const toggleGuestbook = async () => {
    try {
      await axios.put(`${API}/users/guestbook/settings?guestbook_open=${!profileUser.guestbook_open}`);
      loadProfile();
    } catch (error) {
      console.error('Error toggling guestbook:', error);
    }
  };

  const addGuestbookEntry = async () => {
    if (!guestbookMessage.trim()) return;
    
    try {
      await axios.post(`${API}/users/${username}/guestbook`, {
        message: guestbookMessage,
        is_private: isPrivateEntry
      });
      setGuestbookMessage('');
      setIsPrivateEntry(false);
      loadProfile();
    } catch (error) {
      console.error('Error adding guestbook entry:', error);
    }
  };

  const deleteGuestbookEntry = async (entryId) => {
    try {
      await axios.delete(`${API}/users/guestbook/${entryId}`);
      loadProfile();
    } catch (error) {
      console.error('Error deleting guestbook entry:', error);
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
        <div className="text-white text-xl">Lade Profil...</div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Profil nicht gefunden</h2>
            <p className="text-gray-300">Dieser Benutzer existiert nicht oder das Profil ist privat.</p>
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
            onClick={() => window.history.back()}
            variant="outline"
            className="mb-4 border-purple-500/20 text-purple-300 hover:bg-purple-500/10"
          >
            ← Zurück
          </Button>
        </div>

        {/* Profile Header */}
        <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20 mb-8">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-cyan-400 to-purple-600 flex items-center justify-center">
                  <User className="w-10 h-10 text-white" />
                </div>
                <div>
                  <div className="flex items-center space-x-3">
                    <h1 className="text-3xl font-bold text-white">{profileUser.username}</h1>
                    <div className={`w-3 h-3 rounded-full ${profileUser.is_online ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                    {profileUser.is_vip && <Crown className="w-6 h-6 text-yellow-400" />}
                  </div>
                  
                  {/* Banned User Display */}
                  {profileUser.role === 'banned' && (
                    <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 mt-4">
                      <div className="flex items-center justify-center space-x-2">
                        <AlertTriangle className="w-6 h-6 text-red-400" />
                        <span className="text-red-400 font-bold text-lg">
                          Vom Community-Team gesperrt!
                        </span>
                      </div>
                      <p className="text-red-300 text-sm mt-2 text-center">
                        Dieser Benutzer wurde vom Community-Team gesperrt.
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-3 mt-2">
                    <Badge variant={getRoleBadgeVariant(profileUser.role)}>
                      {getRoleDisplayName(profileUser.role)}
                    </Badge>
                    <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                      {profileUser.points} Punkte
                    </Badge>
                  </div>
                </div>
              </div>
              
              {isOwnProfile && (
                <div className="flex space-x-2">
                  <Dialog open={editingProfile} onOpenChange={setEditingProfile}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="border-purple-500/20 text-purple-300 hover:bg-purple-500/10">
                        <Edit className="w-4 h-4 mr-2" />
                        Profil bearbeiten
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-800 border-purple-500/20 max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-white">Profil bearbeiten</DialogTitle>
                        <DialogDescription className="text-gray-300">
                          Aktualisieren Sie Ihre Profilinformationen
                        </DialogDescription>
                      </DialogHeader>
                      <Tabs defaultValue="profile" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-slate-700">
                          <TabsTrigger value="profile" className="text-white">Profil</TabsTrigger>
                          <TabsTrigger value="links" className="text-white">Links</TabsTrigger>
                        </TabsList>
                        <TabsContent value="profile" className="space-y-4">
                          <div>
                            <Label className="text-white">Bio</Label>
                            <Textarea
                              value={profileForm.bio}
                              onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                              className="bg-slate-700 border-slate-600 text-white"
                              placeholder="Erzählen Sie etwas über sich..."
                            />
                          </div>
                          <div>
                            <Label className="text-white">Standort</Label>
                            <Input
                              value={profileForm.location}
                              onChange={(e) => setProfileForm({...profileForm, location: e.target.value})}
                              className="bg-slate-700 border-slate-600 text-white"
                              placeholder="Ihr Standort"
                            />
                          </div>
                          <div>
                            <Label className="text-white">Website</Label>
                            <Input
                              value={profileForm.website}
                              onChange={(e) => setProfileForm({...profileForm, website: e.target.value})}
                              className="bg-slate-700 border-slate-600 text-white"
                              placeholder="https://ihre-website.de"
                            />
                          </div>
                        </TabsContent>
                        <TabsContent value="links" className="space-y-4">
                          <div className="space-y-4">
                            <div>
                              <Label className="text-white">Link 1 (z.B. Twitch)</Label>
                              <div className="flex space-x-2">
                                <Input
                                  value={profileForm.link1_name}
                                  onChange={(e) => setProfileForm({...profileForm, link1_name: e.target.value})}
                                  className="bg-slate-700 border-slate-600 text-white flex-1"
                                  placeholder="Name (z.B. Twitch)"
                                />
                                <Input
                                  value={profileForm.link1_url}
                                  onChange={(e) => setProfileForm({...profileForm, link1_url: e.target.value})}
                                  className="bg-slate-700 border-slate-600 text-white flex-2"
                                  placeholder="https://..."
                                />
                              </div>
                            </div>
                            <div>
                              <Label className="text-white">Link 2 (z.B. Facebook)</Label>
                              <div className="flex space-x-2">
                                <Input
                                  value={profileForm.link2_name}
                                  onChange={(e) => setProfileForm({...profileForm, link2_name: e.target.value})}
                                  className="bg-slate-700 border-slate-600 text-white flex-1"
                                  placeholder="Name (z.B. Facebook)"
                                />
                                <Input
                                  value={profileForm.link2_url}
                                  onChange={(e) => setProfileForm({...profileForm, link2_url: e.target.value})}
                                  className="bg-slate-700 border-slate-600 text-white flex-2"
                                  placeholder="https://..."
                                />
                              </div>
                            </div>
                            <div>
                              <Label className="text-white">Link 3 (z.B. Instagram/YouTube)</Label>
                              <div className="flex space-x-2">
                                <Input
                                  value={profileForm.link3_name}
                                  onChange={(e) => setProfileForm({...profileForm, link3_name: e.target.value})}
                                  className="bg-slate-700 border-slate-600 text-white flex-1"
                                  placeholder="Name (z.B. Instagram)"
                                />
                                <Input
                                  value={profileForm.link3_url}
                                  onChange={(e) => setProfileForm({...profileForm, link3_url: e.target.value})}
                                  className="bg-slate-700 border-slate-600 text-white flex-2"
                                  placeholder="https://..."
                                />
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                      <div className="flex space-x-2 mt-4">
                        <Button 
                          onClick={updateProfile}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          Speichern
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setEditingProfile(false)}
                          className="border-slate-600"
                        >
                          Abbrechen
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Dialog open={changingPassword} onOpenChange={setChangingPassword}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="border-purple-500/20 text-purple-300 hover:bg-purple-500/10">
                        <Key className="w-4 h-4 mr-2" />
                        Passwort ändern
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-800 border-purple-500/20">
                      <DialogHeader>
                        <DialogTitle className="text-white">Passwort ändern</DialogTitle>
                        <DialogDescription className="text-gray-300">
                          Geben Sie Ihr aktuelles und neues Passwort ein
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-white">Aktuelles Passwort</Label>
                          <Input
                            type="password"
                            value={passwordForm.current_password}
                            onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                            className="bg-slate-700 border-slate-600 text-white"
                            placeholder="Aktuelles Passwort eingeben"
                          />
                        </div>
                        <div>
                          <Label className="text-white">Neues Passwort</Label>
                          <Input
                            type="password"
                            value={passwordForm.new_password}
                            onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                            className="bg-slate-700 border-slate-600 text-white"
                            placeholder="Neues Passwort eingeben (min. 6 Zeichen)"
                          />
                        </div>
                        <div>
                          <Label className="text-white">Neues Passwort bestätigen</Label>
                          <Input
                            type="password"
                            value={passwordForm.confirm_password}
                            onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                            className="bg-slate-700 border-slate-600 text-white"
                            placeholder="Neues Passwort wiederholen"
                          />
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            onClick={changePassword}
                            className="bg-purple-600 hover:bg-purple-700"
                            disabled={!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password}
                          >
                            Passwort ändern
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setChangingPassword(false);
                              setPasswordForm({current_password: '', new_password: '', confirm_password: ''});
                            }}
                            className="border-slate-600"
                          >
                            Abbrechen
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {profileUser.bio && (
                  <div>
                    <h3 className="text-white font-medium mb-2">Bio</h3>
                    <p className="text-gray-300">{profileUser.bio}</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  {profileUser.location && (
                    <div className="flex items-center space-x-2 text-gray-300">
                      <MapPin className="w-4 h-4" />
                      <span>{profileUser.location}</span>
                    </div>
                  )}
                  
                  {profileUser.website && (
                    <div className="flex items-center space-x-2 text-gray-300">
                      <Globe className="w-4 h-4" />
                      <a 
                        href={profileUser.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300"
                      >
                        {profileUser.website}
                      </a>
                    </div>
                  )}
                  
                  {/* Social Links */}
                  {(profileUser.link1_name && profileUser.link1_url) && (
                    <div className="flex items-center space-x-2 text-gray-300">
                      <Link2 className="w-4 h-4" />
                      <a 
                        href={profileUser.link1_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 flex items-center"
                      >
                        {profileUser.link1_name}
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  )}
                  
                  {(profileUser.link2_name && profileUser.link2_url) && (
                    <div className="flex items-center space-x-2 text-gray-300">
                      <Link2 className="w-4 h-4" />
                      <a 
                        href={profileUser.link2_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 flex items-center"
                      >
                        {profileUser.link2_name}
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  )}
                  
                  {(profileUser.link3_name && profileUser.link3_url) && (
                    <div className="flex items-center space-x-2 text-gray-300">
                      <Link2 className="w-4 h-4" />
                      <a 
                        href={profileUser.link3_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 flex items-center"
                      >
                        {profileUser.link3_name}
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Calendar className="w-4 h-4" />
                    <span>Mitglied seit {new Date(profileUser.joined_date).toLocaleDateString('de-DE')}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Clock className="w-4 h-4" />
                    <span>
                      {profileUser.is_online ? 'Online' : 
                        `Zuletzt online: ${new Date(profileUser.last_seen).toLocaleDateString('de-DE')}`
                      }
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-slate-700/30 rounded-lg">
                  <h3 className="text-white font-medium mb-2">Community Status</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Rolle:</span>
                      <Badge variant={getRoleBadgeVariant(profileUser.role)} className="text-xs">
                        {getRoleDisplayName(profileUser.role)}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Punkte:</span>
                      <span className="text-white">{profileUser.points}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Status:</span>
                      <span className={profileUser.is_online ? 'text-green-400' : 'text-gray-400'}>
                        {profileUser.is_online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Guestbook */}
        <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                Gästebuch
              </CardTitle>
              
              {isOwnProfile && profileUser.role !== 'banned' && (
                <Button
                  onClick={toggleGuestbook}
                  variant="outline"
                  className={`border-${profileUser.guestbook_open ? 'green' : 'red'}-500/20 text-${profileUser.guestbook_open ? 'green' : 'red'}-300`}
                >
                  {profileUser.guestbook_open ? <Unlock className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                  {profileUser.guestbook_open ? 'Geöffnet' : 'Geschlossen'}
                </Button>
              )}
            </div>
            <CardDescription className="text-gray-300">
              {profileUser.role === 'banned' ? 
                'Gästebuch nicht verfügbar für gesperrte Benutzer' :
                (profileUser.guestbook_open ? 
                  'Hinterlassen Sie eine Nachricht' : 
                  'Das Gästebuch ist geschlossen'
                )
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* Banned user guestbook notice */}
            {profileUser.role === 'banned' && (
              <div className="text-center py-8">
                <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <p className="text-red-400 font-medium">Gästebuch nicht verfügbar</p>
                <p className="text-red-300 text-sm">Das Gästebuch ist für gesperrte Benutzer deaktiviert.</p>
              </div>
            )}
            
            {/* Regular guestbook content */}
            {profileUser.role !== 'banned' && (
              <>
                {/* Guestbook Form - Now available for all users including own profile */}
                {profileUser.guestbook_open && (
                  <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-purple-500/20">
                    <Label className="text-white mb-2 block">
                      {isOwnProfile ? "Eigener Gästebuch-Eintrag schreiben" : "Gästebuch-Eintrag schreiben"}
                    </Label>
                    <Textarea
                      value={guestbookMessage}
                      onChange={(e) => setGuestbookMessage(e.target.value)}
                      className="bg-slate-600 border-slate-500 text-white mb-3"
                      placeholder={isOwnProfile ? "Schreiben Sie sich eine persönliche Notiz..." : "Schreiben Sie eine Nachricht..."}
                      maxLength={500}
                    />
                    <div className="flex items-center space-x-3 mb-3">
                      <input
                        type="checkbox"
                        id="isPrivateEntry"
                        checked={isPrivateEntry}
                        onChange={(e) => setIsPrivateEntry(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="isPrivateEntry" className="text-sm text-yellow-400 flex items-center">
                        🔒 Privater Eintrag (nur für Gästebuch-Besitzer und mich sichtbar)
                      </Label>
                    </div>
                    <Button 
                      onClick={addGuestbookEntry}
                      className="bg-purple-600 hover:bg-purple-700"
                      disabled={!guestbookMessage.trim()}
                    >
                      {isOwnProfile ? "Notiz hinzufügen" : "Nachricht senden"}
                    </Button>
                  </div>
                )}

                <div className="space-y-4">
                  {guestbookEntries.length > 0 ? (
                    guestbookEntries.map((entry) => {
                      const isOwnEntry = entry.author_name === currentUser.username;
                      const isPrivate = entry.is_private;
                      
                      return (
                        <div 
                          key={entry.id} 
                          className={`p-4 rounded-lg border ${
                            isPrivate ? 'bg-orange-900/20 border-orange-500/30' : 'bg-slate-700/30 border-slate-600/30'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              {isPrivate && (
                                <span className="text-orange-400 text-xs font-semibold">🔒 PRIVAT</span>
                              )}
                              <span className={`font-medium ${isOwnEntry ? 'text-cyan-400' : 'text-yellow-400'}`}>
                                {entry.author_name}
                              </span>
                              <span className="text-gray-400 text-sm">
                                {new Date(entry.created_at).toLocaleString('de-DE')}
                              </span>
                            </div>
                            
                            {(isOwnProfile || currentUser.role === 'superuser_admin' || currentUser.role === 'superuser_vip') && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-slate-800 border-purple-500/20">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-white">Eintrag löschen</AlertDialogTitle>
                                    <AlertDialogDescription className="text-gray-300">
                                      Sind Sie sicher, dass Sie diesen Gästebuch-Eintrag löschen möchten?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white">
                                      Abbrechen
                                    </AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => deleteGuestbookEntry(entry.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Löschen
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                          <p className="text-gray-300 whitespace-pre-wrap">{entry.message}</p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      {profileUser.guestbook_open ? 
                        '📝 Noch keine Einträge im Gästebuch.' : 
                        'Das Gästebuch ist geschlossen.'
                      }
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserProfile;