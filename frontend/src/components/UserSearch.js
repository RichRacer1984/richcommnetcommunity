import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Search, User, Crown } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UserSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const performSearch = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${API}/users/search?query=${encodeURIComponent(query)}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="container mx-auto max-w-4xl">
        <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Search className="w-5 h-5 mr-2" />
              Benutzer suchen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white pl-10"
                  placeholder="Benutzername eingeben..."
                />
              </div>

              <div className="space-y-4">
                {loading && (
                  <div className="text-center text-gray-400 py-4">
                    Suche läuft...
                  </div>
                )}

                {!loading && searchQuery.length >= 2 && searchResults.length === 0 && (
                  <div className="text-center text-gray-400 py-4">
                    Keine Benutzer gefunden.
                  </div>
                )}

                {searchResults.map((user) => (
                  <div 
                    key={user.id} 
                    className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30 hover:bg-slate-700/50 transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/profile/${user.username}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-400 to-purple-600 flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-medium">{user.username}</span>
                            <div className={`w-2 h-2 rounded-full ${user.is_online ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                            {user.is_vip && <Crown className="w-4 h-4 text-yellow-400" />}
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                              {getRoleDisplayName(user.role)}
                            </Badge>
                            <Badge variant="outline" className="text-yellow-400 border-yellow-400 text-xs">
                              {user.points} Punkte
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-sm ${user.is_online ? 'text-green-400' : 'text-gray-400'}`}>
                          {user.is_online ? 'Online' : 'Offline'}
                        </div>
                        {user.bio && (
                          <div className="text-xs text-gray-400 mt-1 max-w-xs truncate">
                            {user.bio}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {searchQuery.length < 2 && (
                <div className="text-center text-gray-400 py-8">
                  <Search className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                  <h3 className="text-lg font-medium mb-2">Benutzer durchsuchen</h3>
                  <p>Geben Sie mindestens 2 Zeichen ein, um Benutzer zu finden.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserSearch;