import React, { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Bell, BellRing, X, Check, ExternalLink, MessageCircle, Heart, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Notifications = ({ currentUser }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    // Set up periodic refresh for new notifications
    const interval = setInterval(fetchNotifications, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/notifications/personal`);
      setNotifications(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Fehler beim Laden der Benachrichtigungen');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`${API}/notifications/personal/${notificationId}/read`);
      // Update local state
      setNotifications(notifications.map(notif => 
        notif.id === notificationId ? { ...notif, is_read: true } : notif
      ));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const dismissNotification = async (notificationId) => {
    try {
      await axios.delete(`${API}/notifications/personal/${notificationId}`);
      // Remove from local state
      setNotifications(notifications.filter(notif => notif.id !== notificationId));
    } catch (err) {
      console.error('Error dismissing notification:', err);
    }
  };

  const handleAction = async (notification) => {
    // Mark as read first
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate to the action URL
    if (notification.action_url) {
      if (notification.action_url.startsWith('http')) {
        // External URL
        window.open(notification.action_url, '_blank');
      } else {
        // Internal URL
        navigate(notification.action_url);
      }
    }

    // Auto-dismiss if enabled
    if (notification.auto_dismiss) {
      await dismissNotification(notification.id);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'friend_request':
        return <Users className="w-5 h-5 text-blue-400" />;
      case 'guestbook_entry':
        return <MessageCircle className="w-5 h-5 text-green-400" />;
      case 'chat_invitation':
        return <Heart className="w-5 h-5 text-purple-400" />;
      default:
        return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'friend_request':
        return 'border-blue-500/30 bg-blue-900/20';
      case 'guestbook_entry':
        return 'border-green-500/30 bg-green-900/20';
      case 'chat_invitation':
        return 'border-purple-500/30 bg-purple-900/20';
      default:
        return 'border-gray-500/30 bg-gray-900/20';
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now - past) / 1000);
    
    if (diffInSeconds < 60) return `vor ${diffInSeconds} Sekunden`;
    if (diffInSeconds < 3600) return `vor ${Math.floor(diffInSeconds / 60)} Minuten`;
    if (diffInSeconds < 86400) return `vor ${Math.floor(diffInSeconds / 3600)} Stunden`;
    return `vor ${Math.floor(diffInSeconds / 86400)} Tagen`;
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-white text-center mt-20">Lade Benachrichtigungen...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button 
            onClick={() => navigate('/community')}
            variant="outline" 
            className="mb-4 border-purple-500/20 text-purple-300 hover:bg-purple-500/10"
          >
            ← Zurück zum Dashboard
          </Button>
          
          <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3 text-white">
                {unreadCount > 0 ? (
                  <BellRing className="w-6 h-6 text-purple-400" />
                ) : (
                  <Bell className="w-6 h-6 text-gray-400" />
                )}
                <span>Persönliche Benachrichtigungen</span>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadCount} neue
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Notifications List */}
        {error && (
          <Card className="bg-red-900/50 border-red-500/30 mb-4">
            <CardContent className="p-4">
              <div className="text-red-300">{error}</div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
              <CardContent className="p-8 text-center">
                <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">
                  Keine Benachrichtigungen
                </h3>
                <p className="text-gray-400">
                  Du hast derzeit keine persönlichen Benachrichtigungen.
                </p>
              </CardContent>
            </Card>
          ) : (
            notifications.map((notification) => (
              <Card 
                key={notification.id} 
                className={`${getNotificationColor(notification.notification_type)} backdrop-blur-sm ${
                  !notification.is_read ? 'ring-2 ring-purple-500/30' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.notification_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-white font-medium mb-1">
                            {notification.title}
                            {!notification.is_read && (
                              <span className="ml-2 w-2 h-2 bg-purple-400 rounded-full inline-block"></span>
                            )}
                          </h4>
                          <p className="text-gray-300 text-sm mb-2">
                            {notification.message}
                          </p>
                          {notification.sender_username && (
                            <p className="text-gray-400 text-xs mb-2">
                              Von: {notification.sender_username}
                            </p>
                          )}
                          <p className="text-gray-500 text-xs">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          {!notification.is_read && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markAsRead(notification.id)}
                              className="text-gray-400 hover:text-white"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => dismissNotification(notification.id)}
                            className="text-gray-400 hover:text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {notification.action_url && notification.action_text && (
                        <div className="mt-3">
                          <Button
                            size="sm"
                            onClick={() => handleAction(notification)}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            {notification.action_text}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <Card className="bg-slate-800/60 backdrop-blur-sm border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Benachrichtigungsoptionen:</span>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={fetchNotifications}
                    className="border-purple-500/20 text-purple-300 hover:bg-purple-500/10"
                  >
                    Aktualisieren
                  </Button>
                  {unreadCount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        notifications.forEach(notif => {
                          if (!notif.is_read) {
                            markAsRead(notif.id);
                          }
                        });
                      }}
                      className="border-purple-500/20 text-purple-300 hover:bg-purple-500/10"
                    >
                      Alle als gelesen markieren
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Notifications;