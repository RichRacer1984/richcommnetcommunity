/**
 * RichComm NetCommunity Style Chat System
 * Integrated with RichComm Authentication
 * Auto-login with dashboard credentials
 */

class RichChat {
    constructor() {
        this.currentUser = null;
        this.currentRoom = 'hauptraum';
        this.userRole = 'user';
        this.userStatus = 'online';
        this.messages = {};
        this.users = {};
        this.roomUsers = {};
        this.privateMessages = {};
        this.mutedUsers = [];
        this.bannedUsers = [];
        this.awayUsers = [];
        this.customColors = {};
        this.authToken = null;
        this.backendUrl = null;
        this.currentProfileUser = null;
        this.temporarySuperusers = []; // Temporary SUPERUSER rights in current session
        this.rooms = {
            'hauptraum': { name: 'Hauptraum', description: 'Hauptchat für alle User', locked: false },
            'lounge': { name: 'Lounge', description: 'Entspannter Chat', locked: false },
            'gaming': { name: 'Gaming', description: 'Alles über Games', locked: false },
            'musik': { name: 'Musik', description: 'Musik und Sound', locked: false },
            'exil': { name: 'Exil', description: 'Strafraum für störende User', locked: false },
            'vip': { name: 'VIP-Lounge', description: 'Nur für VIPs', locked: false },
            'admin': { name: 'Admin', description: 'Admin-Bereich', locked: false }
        };
        
        this.init();
    }

    async init() {
        this.initializeChat();
        await this.checkAuthentication();
        this.setupEventListeners();
        this.startHeartbeat();
        
        // Check if help should be opened automatically
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('open') === 'help') {
            // Small delay to ensure UI is loaded
            setTimeout(() => {
                this.showHelp();
            }, 1000);
        }
    }

    setupEventListeners() {
        // Set up event listeners (moved from initializeChat)
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Room switching
        document.querySelectorAll('.room-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.switchRoom(e.target.getAttribute('data-room'));
            });
        });
    }

    startHeartbeat() {
        // Start heartbeat functionality (placeholder for now)
        // This could be used for keeping the connection alive
    }

    async checkAuthentication() {
        try {
            // Update login status
            document.getElementById('loginStatus').textContent = 'Prüfe Authentifizierung...';
            
            // Get auth token from localStorage (same as main app)
            this.authToken = localStorage.getItem('token');
            
            // Get backend URL from meta tag or default
            this.backendUrl = this.getBackendUrl();
            
            if (this.authToken) {
                document.getElementById('loginStatus').textContent = 'Lade Benutzer-Daten...';
                // User is already logged in, get their data
                await this.loadUserFromBackend();
            } else {
                // No auth token, show login
                document.getElementById('loginStatus').textContent = 'Kein Login gefunden - Manuelle Anmeldung erforderlich';
                this.showLoginModal();
            }
        } catch (error) {
            console.error('Authentication check failed:', error);
            document.getElementById('loginStatus').textContent = 'Authentifizierung fehlgeschlagen - Manuelle Anmeldung';
            this.showLoginModal();
        }
    }

    getBackendUrl() {
        // Try to get from window (set by React app)
        if (window.REACT_APP_BACKEND_URL) {
            return window.REACT_APP_BACKEND_URL;
        }
        
        // Fallback: construct from current location
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        
        // For preview domains, use the same domain
        if (hostname.includes('preview.emergentagent.com')) {
            return `${protocol}//${hostname}`;
        }
        
        // Default fallback
        return `${protocol}//${hostname}:8001`;
    }

    async loadUserFromBackend() {
        try {
            document.getElementById('loginStatus').textContent = 'Verbinde mit Server...';
            
            const response = await fetch(`${this.backendUrl}/api/community/dashboard`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load user data');
            }

            const data = await response.json();
            const user = data.user;

            if (user) {
                document.getElementById('loginStatus').textContent = `Angemeldet als ${user.username}`;
                
                this.currentUser = user.username;
                this.userRole = this.mapRoleFromBackend(user.role);
                
                // Auto-login with backend data
                await this.autoLogin();
            } else {
                throw new Error('No user data received');
            }
        } catch (error) {
            console.error('Failed to load user from backend:', error);
            // Clear invalid token
            localStorage.removeItem('token');
            document.getElementById('loginStatus').textContent = 'Server-Verbindung fehlgeschlagen';
            this.showLoginModal();
        }
    }

    mapRoleFromBackend(backendRole) {
        // Map backend roles to chat roles
        switch (backendRole) {
            case 'superuser_admin':
                return 'admin';
            case 'superuser_vip':
                return 'vip';
            case 'forum_moderator':
                return 'moderator';
            case 'superuser':
                return 'vip';
            default:
                return 'user';
        }
    }

    async autoLogin() {
        // Hide login modal
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('chatContainer').style.display = 'flex';
        
        // Store login time
        this.loginTime = new Date();
        
        // Update UI with user data
        document.getElementById('currentUser').textContent = this.currentUser;
        document.getElementById('currentRoom').textContent = this.rooms[this.currentRoom].name;
        document.getElementById('statusUsername').textContent = this.currentUser;
        document.getElementById('statusRole').textContent = this.userRole.toUpperCase();
        document.getElementById('statusRoom').textContent = this.rooms[this.currentRoom].name;

        // Show role-specific commands
        if (this.userRole === 'admin') {
            document.getElementById('adminCommands').style.display = 'block';
            document.getElementById('vipCommands').style.display = 'block';
        } else if (['vip', 'moderator'].includes(this.userRole)) {
            document.getElementById('vipCommands').style.display = 'block';
        }

        // Add user to room
        this.addUserToRoom(this.currentUser, this.userRole);
        this.addSystemMessage(this.currentRoom, `${this.currentUser} hat den Chat betreten.`);
        this.updateDisplay();

        // Load existing users from backend
        await this.loadOnlineUsersFromBackend();

        // Start auto-refresh
        setInterval(() => {
            this.simulateActivity();
        }, 30000); // Every 30 seconds

        // Sync with backend every 60 seconds
        setInterval(() => {
            this.syncWithBackend();
        }, 60000);
    }

    async loadOnlineUsersFromBackend() {
        try {
            const response = await fetch(`${this.backendUrl}/api/community/online-stats`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                
                // Add online users to hauptraum
                const onlineUsers = [
                    ...(data.online_users || []).map(u => ({ ...u, role: 'user' })),
                    ...(data.online_vips || []).map(u => ({ ...u, role: 'vip' })),
                    ...(data.online_admins || []).map(u => ({ ...u, role: 'admin' })),
                    ...(data.online_forum_moderators || []).map(u => ({ ...u, role: 'moderator' }))
                ];

                // Clear existing users (except current user)
                Object.keys(this.roomUsers).forEach(room => {
                    this.roomUsers[room] = this.roomUsers[room].filter(u => u.name === this.currentUser);
                });

                // Add online users to hauptraum
                onlineUsers.forEach(user => {
                    if (user.username !== this.currentUser) {
                        // Add moderation indicator for VIPs, Admins, and Forum Moderators
                        let displayName = user.username;
                        if (['vip', 'admin', 'moderator'].includes(user.role)) {
                            displayName += ' (c)';
                        }
                        
                        this.roomUsers['hauptraum'].push({
                            name: user.username,
                            displayName: displayName,
                            role: user.role,
                            status: 'online',
                            joinTime: new Date()
                        });
                    }
                });

                this.updateUserList();
            }
        } catch (error) {
            console.error('Failed to load online users:', error);
        }
    }

    async syncWithBackend() {
        // Keep session alive and sync online status
        try {
            await fetch(`${this.backendUrl}/api/users/heartbeat`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Heartbeat failed:', error);
        }
    }

    showLoginModal() {
        document.getElementById('loginModal').style.display = 'flex';
        document.getElementById('chatContainer').style.display = 'none';
    }

    initializeChat() {
        // Initialize messages for all rooms
        Object.keys(this.rooms).forEach(room => {
            this.messages[room] = [];
            this.roomUsers[room] = [];
        });

        // Add welcome message to hauptraum
        this.addSystemMessage('hauptraum', 'Willkommen im RichComm NetCommunity Chat! Gib /help ein für alle Befehle.');
        
        // Start clock
        this.startClock();
    }

    login() {
        // Manual login fallback (if auto-login fails)
        const username = document.getElementById('loginUsername').value.trim();
        const role = document.getElementById('userRole').value;

        if (!username || username.length < 2) {
            alert('Bitte gib einen gültigen Benutzernamen ein (min. 2 Zeichen)');
            return;
        }

        if (this.isUsernameTaken(username)) {
            alert('Dieser Benutzername ist bereits vergeben!');
            return;
        }

        this.currentUser = username;
        this.userRole = role;
        
        this.completeLogin();
    }

    completeLogin() {
        // Common login completion logic
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('chatContainer').style.display = 'flex';
        document.getElementById('currentUser').textContent = this.currentUser;
        document.getElementById('currentRoom').textContent = this.rooms[this.currentRoom].name;
        document.getElementById('statusUsername').textContent = this.currentUser;
        document.getElementById('statusRole').textContent = this.userRole.toUpperCase();
        document.getElementById('statusRoom').textContent = this.rooms[this.currentRoom].name;

        // Show role-specific commands
        if (this.userRole === 'admin') {
            document.getElementById('adminCommands').style.display = 'block';
            document.getElementById('vipCommands').style.display = 'block';
        } else if (['vip', 'moderator'].includes(this.userRole)) {
            document.getElementById('vipCommands').style.display = 'block';
        }

        // Add user to room
        this.addUserToRoom(this.currentUser, this.userRole);
        this.addSystemMessage(this.currentRoom, `${this.currentUser} hat den Chat betreten.`);
        this.updateDisplay();

        // Simulate other users if no backend integration
        if (!this.authToken) {
            this.simulateUsers();
        }

        // Start auto-refresh
        setInterval(() => {
            this.simulateActivity();
        }, 30000);
    }

    isUsernameTaken(username) {
        return Object.values(this.roomUsers).some(users => 
            users.some(user => user.name.toLowerCase() === username.toLowerCase())
        );
    }

    addUserToRoom(username, role) {
        if (!this.roomUsers[this.currentRoom]) {
            this.roomUsers[this.currentRoom] = [];
        }

        // Remove user from all other rooms first
        Object.keys(this.roomUsers).forEach(room => {
            this.roomUsers[room] = this.roomUsers[room].filter(user => user.name !== username);
        });

        // Add moderation indicator for VIPs, Admins, and Forum Moderators
        let displayName = username;
        if (['vip', 'admin', 'moderator'].includes(role)) {
            displayName += ' (c)';
        }

        // Add to current room
        this.roomUsers[this.currentRoom].push({
            name: username,
            displayName: displayName,
            role: role,
            status: 'online',
            joinTime: new Date()
        });

        this.updateUserList();
    }

    switchRoom(roomId) {
        if (!this.currentUser) return;

        const oldRoom = this.currentRoom;
        this.currentRoom = roomId;

        // Check room access
        if ((roomId === 'vip' && !['vip', 'admin'].includes(this.userRole)) ||
            (roomId === 'admin' && this.userRole !== 'admin')) {
            this.addSystemMessage(oldRoom, `Zugang zum Raum "${this.rooms[roomId].name}" verweigert!`);
            this.currentRoom = oldRoom;
            return;
        }

        // Update UI
        document.querySelectorAll('.room-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-room="${roomId}"]`).classList.add('active');
        document.getElementById('currentRoom').textContent = this.rooms[roomId].name;
        document.getElementById('statusRoom').textContent = this.rooms[roomId].name;
        document.getElementById('roomInfo').textContent = `${this.rooms[roomId].name} - ${this.rooms[roomId].description}`;

        // Move user between rooms
        this.addUserToRoom(this.currentUser, this.userRole);
        
        // Add room change messages
        this.addSystemMessage(oldRoom, `${this.currentUser} hat den Raum verlassen.`);
        this.addSystemMessage(roomId, `${this.currentUser} hat den Raum betreten.`);

        this.updateDisplay();
    }

    sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();

        if (!message || !this.currentUser) return;

        // Clear input
        input.value = '';

        // Check if it's a command
        if (message.startsWith('/')) {
            this.processCommand(message);
        } else {
            // Regular message
            this.addMessage(this.currentRoom, this.currentUser, message, this.userRole);
        }

        this.updateDisplay();
    }

    processCommand(command) {
        const parts = command.slice(1).split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        switch (cmd) {
            case 'help':
                this.showHelpPopup();
                break;
            case 'w':
                this.userInfoDetailedCommand(args);  // /w now shows detailed info (was /wc)
                break;
            case 'whisper':
            case 'flüster':
                this.whisperCommand(args);
                break;
            case 'who':
                this.whoCommand();
                break;
            // Removed: /wc command (now /w does the detailed info)
            case 'me':
                this.actionCommand(args);
                break;
            case 'away':
                this.setAway();
                break;
            case 'back':
                this.setBack();
                break;
            case 'time':
                this.timeCommand();
                break;
            case 'clear':
                this.clearChat();
                break;
            case 'col':
            case 'color':
                this.colorCommand(args);
                break;
            case 'nick':
                this.nickCommand(args);
                break;
            case 'f+':
                this.friendRequestCommand(args);
                break;
            case 'a':
                this.acceptFriendCommand();
                break;
            case 'i':
                this.inviteCommand(args);
                break;
            case 'su':
                this.temporarySuperuserCommand(args);
                break;
            case 'rsu':
                this.removeTemporarySuperuserCommand(args);
                break;
            case 'gag':
                this.gagCommand(args);
                break;
            case 'k':
                this.exileCommand(args);
                break;
            case 'kh':
                // Only VIP and Admin can use /kh command
                if (['vip', 'admin'].includes(this.userRole)) {
                    this.temporaryBanCommand(args);
                } else {
                    this.addCommandResponse('❌ /kh ist nur für VIPs und Admins verfügbar, nicht für temporäre SUPERUSER.');
                }
                break;
            case 'ban':
                this.banCommand(args);
                break;
            case 'op':
                this.opCommand(args);
                break;
            case 'l':
            case 'lock':
                this.lockRoomCommand(args);
                break;
            case 'unlock':
                this.unlockRoom();
                break;
            case 'mod':
                this.moderateRoom();
                break;
            case 'unmod':
                this.unmoderateRoom();
                break;
            case 'users':
                this.whoCompleteCommand();
                break;
            case 't':
                this.setRoomTopicCommand(args);
                break;
            case 'rooms':
                this.listRooms();
                break;
            case 'ignore':
                this.ignoreCommand(args);
                break;
            case 'unignore':
                this.unignoreCommand(args);
                break;
            case 'status':
                this.statusCommand();
                break;
            case 'sepa':
                this.createPrivateRoomCommand(args);
                break;
            case 'pm':
            case 'msg':
                this.privateMessageCommand(args);
                break;
            default:
                this.addCommandResponse(`❌ Unbekannter Befehl: /${cmd}. Gib /help ein für alle Befehle.`);
        }
    }

    showHelp() {
        const commands = [
            '=== GRUNDBEFEHLE ===',
            '/help - Diese Befehlsliste anzeigen',
            '/w <user> - User-Info (einzeilig) anzeigen',
            '/wc <user> - User-Info (detailliert) anzeigen', 
            '/whisper <user> <text> - Flüsternachricht senden',
            '/who - User im aktuellen Raum anzeigen',
            '/me <text> - Aktion ausführen (* nickname text)',
            '/away - Als abwesend markieren',
            '/back - Als anwesend markieren', 
            '/time - Aktuelle Zeit anzeigen',
            '/clear - Chat-Verlauf löschen',
            '/status - Eigenen Status anzeigen',
            '/pm <user> <text> - Private Nachricht senden',
            '/rooms - Verfügbare Räume anzeigen',
            '/ignore <user> - User ignorieren',
            '/unignore <user> - User nicht mehr ignorieren'
        ];

        if (['vip', 'moderator', 'admin'].includes(this.userRole)) {
            commands.push(
                '',
                '=== VIP/MODERATOR BEFEHLE ==='
            );
            
            // Commands available to all elevated users
            commands.push(
                '/gag <user> [min] - User temporär stumm schalten',
                '/k <user> - User aus Raum kicken',
                '/kh <user> <grund> - User mit Begründung kicken'
            );
            
            // Commands only for VIP and Admin (SUPERUSER roles)
            if (['vip', 'admin'].includes(this.userRole)) {
                commands.push(
                    '/col <hex> - Textfarbe ändern (#ff0000)',
                    '/nick <name> - Nickname ändern',
                    '/f+ <user> - Freundschaftsanfrage senden',
                    '/a - Letzte Freundschaftsanfrage annehmen',
                    '/i <user> - User in aktuellen Raum einladen',
                    '/su <user> - User SUPERUSER-Rechte verleihen',
                    '/rsu <user> - SUPERUSER-Rechte entziehen'
                );
            }
        }

        if (this.userRole === 'admin') {
            commands.push(
                '',
                '=== ADMIN BEFEHLE ===',
                '/ban <user> - User permanent bannen',
                '/mute <user> - User muten',
                '/unmute <user> - User entmuten',
                '/op <user> - User Moderator-Rechte geben',
                '/l [raum] - Raum für normale User sperren',
                '/unlock - Aktuellen Raum freigeben',
                '/mod - Raum-Moderation aktivieren',
                '/unmod - Raum-Moderation deaktivieren'
            );
        }

        // Display all commands
        commands.forEach(cmd => {
            this.addCommandResponse(cmd);
        });
    }

    showHelpPopup() {
        document.getElementById('helpModal').style.display = 'flex';
        this.loadHelpContent();
    }

    loadHelpContent() {
        const helpContent = document.getElementById('helpContent');
        
        const content = `
        <div style="background: #000033; border: 1px solid #00ffff; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #00ffff; margin-bottom: 15px; text-align: center;">🏛️ RICHCOMM ROLLEN-SYSTEM</h3>
            
            <div style="margin-bottom: 15px;">
                <h4 style="color: #ff0000;">👑 ADMIN (Höchste Berechtigung)</h4>
                <div style="margin-left: 20px; color: #ffffff;">
                    • <strong>Vollzugriff:</strong> Alle Chat- und System-Funktionen<br>
                    • <strong>User-Management:</strong> Kann alle Rollen vergeben und entziehen<br>
                    • <strong>Raum-Kontrolle:</strong> Kann alle Räume sperren/entsperren<br>
                    • <strong>Moderation:</strong> Kicken, Bannen, Muten aller User<br>
                    • <strong>SUPERUSER-Verwaltung:</strong> Kann temporäre SUPERUSER ernennen<br>
                    • <strong>Besonderes:</strong> Permanente Rechte, können nicht degradiert werden
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <h4 style="color: #ff00ff;">⭐ VIP (SUPERUSER-Status)</h4>
                <div style="margin-left: 20px; color: #ffffff;">
                    • <strong>Erweiterte Rechte:</strong> Alle VIP-Features und Chat-Moderation<br>
                    • <strong>Personalisierung:</strong> Textfarbe ändern (/col), Nickname ändern (/nick)<br>
                    • <strong>Soziale Features:</strong> Freundschaftsanfragen senden (/f+)<br>
                    • <strong>Chat-Einladungen:</strong> User in Räume einladen (/i)<br>
                    • <strong>SUPERUSER-Verwaltung:</strong> Kann temporäre SUPERUSER ernennen<br>
                    • <strong>Moderation:</strong> Kicken (/k), Gaggen (/gag) von Usern
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <h4 style="color: #ffaa00;">🛡️ FOREN MODERATOR</h4>
                <div style="margin-left: 20px; color: #ffffff;">
                    • <strong>Forum-Verwaltung:</strong> Moderation der Forum-Bereiche<br>
                    • <strong>Chat-Moderation:</strong> Basis-Moderationsbefehle (Kick, Gag)<br>
                    • <strong>Kein SUPERUSER:</strong> Keine erweiterten VIP-Features<br>
                    • <strong>Spezialrolle:</strong> Fokus auf Community-Moderation<br>
                    • <strong>Begrenzte Rechte:</strong> Kann keine SUPERUSER ernennen
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <h4 style="color: #ffff00;">⚡ TEMPORÄRE SUPERUSER</h4>
                <div style="margin-left: 20px; color: #ffffff;">
                    • <strong>Zeitlich begrenzt:</strong> Nur für aktuelle Chat-Session gültig<br>
                    • <strong>Moderation:</strong> Kann User kicken (/k) und gaggen (/gag)<br>
                    • <strong>Vergeben durch:</strong> VIPs und Admins mit /su command<br>
                    • <strong>Erkennung:</strong> ⚡ Symbol neben dem Namen in User-Liste<br>
                    • <strong>Entziehbar:</strong> Mit /rsu command durch VIPs/Admins<br>
                    • <strong>Private Räume:</strong> Können in eigenen privaten Räumen SUPERUSER vergeben
                </div>
            </div>
            
            <div>
                <h4 style="color: #00ff00;">👤 STANDARD USER</h4>
                <div style="margin-left: 20px; color: #ffffff;">
                    • <strong>Basis-Chat:</strong> Nachrichten schreiben und lesen<br>
                    • <strong>Private Nachrichten:</strong> Whisper und PM-Funktionen<br>
                    • <strong>User-Info:</strong> Kann User-Profile anzeigen (/w, /wc)<br>
                    • <strong>Navigation:</strong> Zwischen öffentlichen Räumen wechseln<br>
                    • <strong>Sozial:</strong> Gästebuch-Einträge schreiben und empfangen
                </div>
            </div>
        </div>

        <div style="background: #003300; border: 1px solid #00ff00; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #00ff00; margin-bottom: 15px; text-align: center;">💬 CHAT-BEFEHLE</h3>
            
            <div style="margin-bottom: 15px;">
                <h4 style="color: #00ff00;">👤 BASIS-BEFEHLE (Alle User)</h4>
                <div style="margin-left: 20px; font-family: 'Courier New', monospace; font-size: 11px;">
                    <strong>/help</strong> - Diese Hilfeseite anzeigen<br>
                    <strong>/w &lt;user&gt;</strong> - Detaillierte User-Info anzeigen<br>
                    <strong>/who</strong> - Alle User im aktuellen Raum auflisten<br>
                    <strong>/users</strong> - Alle User in allen Räumen anzeigen<br>
                    <strong>/whisper &lt;user&gt; &lt;msg&gt;</strong> - Private Nachricht senden (nur im Raum)<br>
                    <strong>/f+ &lt;user&gt;</strong> - Freundschaftsanfrage senden<br>
                    <strong>/a</strong> - Away-Status setzen<br>
                    <strong>/col #hexcode</strong> - Textfarbe ändern (z.B. /col #ff0000 für rot)
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <h4 style="color: #ffaa00;">🛡️ MODERATIONS-BEFEHLE (VIP, Admin, temp. SUPERUSER)</h4>
                <div style="margin-left: 20px; font-family: 'Courier New', monospace; font-size: 11px;">
                    <strong>/k &lt;user&gt;</strong> - User ins Exil werfen<br>
                    <strong>/gag &lt;user&gt; [minuten]</strong> - User temporär stumm schalten (Standard: 5min)<br>
                    <strong>/t &lt;thema&gt;</strong> - Raumthema setzen (auch temp. SUPERUSER)<br>
                    <strong>/sepa &lt;raumname&gt;</strong> - Privaten Raum erstellen (Ersteller bekommt temp. SUPERUSER)
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <h4 style="color: #ff00ff;">⭐ VIP/SUPERUSER-BEFEHLE (Nur VIP & Admin)</h4>
                <div style="margin-left: 20px; font-family: 'Courier New', monospace; font-size: 11px;">
                    <strong>/nick &lt;name&gt;</strong> - Nickname temporär ändern<br>
                    <strong>/i &lt;user&gt;</strong> - User in aktuellen Raum einladen<br>
                    <strong>/su &lt;user&gt;</strong> - Temporäre SUPERUSER-Rechte verleihen<br>
                    <strong>/rsu &lt;user&gt;</strong> - Temporäre SUPERUSER-Rechte entziehen<br>
                    <strong>/kh &lt;user&gt; &lt;minuten&gt;</strong> - User temporär aus Chat bannen (nur VIP/Admin)
                </div>
            </div>
            
            <div>
                <h4 style="color: #ff0000;">👑 ADMIN-BEFEHLE (Nur Admins)</h4>
                <div style="margin-left: 20px; font-family: 'Courier New', monospace; font-size: 11px;">
                    <strong>/ban &lt;user&gt;</strong> - User permanent aus Chat bannen<br>
                    <strong>/op &lt;user&gt;</strong> - User zu Moderator machen<br>
                    <strong>/l [raumname]</strong> - Raum für normale User sperren<br>
                    <strong>/unlock</strong> - Aktuellen Raum wieder freigeben<br>
                    <strong>/mod</strong> - Raum-Moderation aktivieren (alle Nachrichten müssen freigegeben werden)<br>
                    <strong>/unmod</strong> - Raum-Moderation deaktivieren
                </div>
            </div>
        </div>

        <div style="background: #330033; border: 1px solid #ff00ff; padding: 20px;">
            <h3 style="color: #ff00ff; margin-bottom: 15px; text-align: center;">🏆 PUNKTESYSTEM</h3>
            
            <div style="margin-bottom: 15px;">
                <h4 style="color: #ffff00;">💰 PUNKTE VERDIENEN (+)</h4>
                <div style="margin-left: 20px; color: #ffffff;">
                    <strong>+5 Punkte</strong> - Für jede Chat-Nachricht (Max. 50/Tag)<br>
                    <strong>+10 Punkte</strong> - Für jeden Gästebuch-Eintrag (Max. 30/Tag)<br>
                    <strong>+15 Punkte</strong> - Für jeden Forum-Beitrag (Max. 100/Tag)<br>
                    <strong>+25 Punkte</strong> - Für das Erstellen neuer Forum-Topics (Max. 50/Tag)<br>
                    <strong>+20 Punkte</strong> - Für das Anmelden im Chat (1x täglich)<br>
                    <strong>+50 Punkte</strong> - Für das erste Login des Tages<br>
                    <strong>Bonus-Punkte</strong> - Für besondere Community-Aktivitäten
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <h4 style="color: #ff6666;">💸 PUNKTE VERLIEREN (-)</h4>
                <div style="margin-left: 20px; color: #ffffff;">
                    <strong>-50 Punkte</strong> - Bei Verwarnungen durch Moderatoren<br>
                    <strong>-100 Punkte</strong> - Bei temporären Chat-Sperren (Gag)<br>
                    <strong>-200 Punkte</strong> - Beim Kicken aus Chat-Räumen<br>
                    <strong>-500 Punkte</strong> - Bei temporären Banns<br>
                    <strong>-1000 Punkte</strong> - Bei schweren Regelverstößen<br>
                    <strong>Totaler Verlust</strong> - Bei permanenten Banns
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <h4 style="color: #00ffff;">🎯 VERWENDUNG DER PUNKTE</h4>
                <div style="margin-left: 20px; color: #ffffff;">
                    • <strong>Toplist-Ranking:</strong> Deine Position in der Community-Rangliste<br>
                    • <strong>Status-Symbol:</strong> Zeigt deine Aktivität und Standing<br>
                    • <strong>Zugang zu Features:</strong> Bestimmte Features erfordern Mindestpunkte<br>
                    • <strong>Community-Ansehen:</strong> Andere User sehen deine Punktzahl<br>
                    • <strong>Belohnungen:</strong> Hohe Punktzahlen können zu Beförderungen führen
                </div>
            </div>
            
            <div>
                <h4 style="color: #00ff00;">📊 PUNKTZAHL-BEREICHE</h4>
                <div style="margin-left: 20px; color: #ffffff;">
                    <strong>0 - 500 Punkte:</strong> 🌱 Neuling<br>
                    <strong>501 - 2000 Punkte:</strong> 👤 Aktiver User<br>
                    <strong>2001 - 5000 Punkte:</strong> 🌟 Erfahrener User<br>
                    <strong>5001 - 10000 Punkte:</strong> 💎 Community-Veteran<br>
                    <strong>10001+ Punkte:</strong> 🏆 Elite-Member<br>
                </div>
            </div>
            
            <div style="margin-top: 15px; padding: 10px; background: #001122; border: 1px solid #0088ff; color: #00ddff;">
                <strong>💡 TIPP:</strong> Sei aktiv, hilfsbereit und respektvoll in der Community, um Punkte zu sammeln und aufzusteigen!
            </div>
        </div>
        `;
        
        helpContent.innerHTML = content;
    }

    whisperCommand(args) {
        if (args.length < 2) {
            this.addCommandResponse('Verwendung: /w <username> <nachricht>');
            return;
        }

        const targetUser = args[0];
        const message = args.slice(1).join(' ');
        
        if (this.isUserOnline(targetUser)) {
            this.addPrivateMessage(this.currentUser, targetUser, message);
            this.addCommandResponse(`Flüstert zu ${targetUser}: ${message}`);
        } else {
            this.addCommandResponse(`User "${targetUser}" ist nicht online.`);
        }
    }

    whoCommand() {
        const users = this.roomUsers[this.currentRoom] || [];
        if (users.length === 0) {
            this.addCommandResponse('Keine User in diesem Raum.');
            return;
        }

        this.addCommandResponse(`User in ${this.rooms[this.currentRoom].name}:`);
        users.forEach(user => {
            const status = this.awayUsers.includes(user.name) ? ' (away)' : '';
            const roleText = user.role !== 'user' ? ` [${user.role.toUpperCase()}]` : '';
            this.addCommandResponse(`- ${user.displayName || user.name}${roleText}${status}`);
        });
    }

    actionCommand(args) {
        if (args.length === 0) {
            this.addCommandResponse('Verwendung: /me <aktion>');
            return;
        }

        const action = args.join(' ');
        this.addMessage(this.currentRoom, '', `* ${this.currentUser} ${action}`, 'action');
    }

    setAway() {
        if (!this.awayUsers.includes(this.currentUser)) {
            this.awayUsers.push(this.currentUser);
            
            // Track away time
            if (!this.awayTimes) this.awayTimes = {};
            this.awayTimes[this.currentUser] = new Date();
            
            this.addSystemMessage(this.currentRoom, `${this.currentUser} ist jetzt abwesend.`);
            this.updateUserList();
        }
    }

    setBack() {
        const index = this.awayUsers.indexOf(this.currentUser);
        if (index !== -1) {
            this.awayUsers.splice(index, 1);
            
            // Remove away time tracking
            if (this.awayTimes && this.awayTimes[this.currentUser]) {
                delete this.awayTimes[this.currentUser];
            }
            
            this.addSystemMessage(this.currentRoom, `${this.currentUser} ist wieder da.`);
            this.updateUserList();
        }
    }

    timeCommand() {
        const now = new Date();
        this.addCommandResponse(`Aktuelle Zeit: ${now.toLocaleString('de-DE')}`);
    }

    clearChat() {
        this.messages[this.currentRoom] = [];
        this.updateDisplay();
        this.addCommandResponse('Chat-Verlauf gelöscht.');
    }

    colorCommand(args) {
        // /col command now available for ALL users
        if (args.length !== 1 || !args[0].startsWith('#')) {
            this.addCommandResponse('❌ Verwendung: /col #hexcode (z.B. /col #ff0000 für rot)');
            this.addCommandResponse('💡 Farb-Beispiele: #ff0000 (rot), #00ff00 (grün), #0000ff (blau), #ffff00 (gelb), #ff00ff (magenta), #00ffff (cyan)');
            return;
        }

        // Validate hex color
        const color = args[0];
        if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
            this.addCommandResponse('❌ Ungültige Hex-Farbe. Verwende Format: #RRGGBB');
            return;
        }

        this.customColors[this.currentUser] = color;
        this.addCommandResponse(`✅ Textfarbe geändert zu ${color}`);
        
        // Show preview
        const previewDiv = document.createElement('div');
        previewDiv.style.color = color;
        previewDiv.style.display = 'inline';
        previewDiv.textContent = ` ← So sieht deine neue Farbe aus!`;
        
        // Add preview to last command response
        setTimeout(() => {
            const messages = document.querySelectorAll('.command-response');
            if (messages.length > 0) {
                const lastMessage = messages[messages.length - 1];
                lastMessage.appendChild(previewDiv);
            }
        }, 100);
    }

    nickCommand(args) {
        if (!['vip', 'admin'].includes(this.userRole)) {
            this.addCommandResponse('❌ Nur SUPERUSER (VIPs und Admins) können den Nick ändern.');
            return;
        }

        if (args.length !== 1) {
            this.addCommandResponse('Verwendung: /nick <neuer_name>');
            return;
        }

        const newNick = args[0];
        if (this.isUsernameTaken(newNick)) {
            this.addCommandResponse('Dieser Name ist bereits vergeben.');
            return;
        }

        const oldNick = this.currentUser;
        this.currentUser = newNick;
        document.getElementById('currentUser').textContent = newNick;
        document.getElementById('statusUsername').textContent = newNick;

        // Update in room user list
        const roomUsers = this.roomUsers[this.currentRoom];
        const userIndex = roomUsers.findIndex(user => user.name === oldNick);
        if (userIndex !== -1) {
            roomUsers[userIndex].name = newNick;
            
            // Update displayName with moderation indicator if applicable
            let displayName = newNick;
            if (['vip', 'admin', 'moderator'].includes(roomUsers[userIndex].role)) {
                displayName += ' (c)';
            }
            roomUsers[userIndex].displayName = displayName;
        }

        this.addSystemMessage(this.currentRoom, `${oldNick} heißt jetzt ${newNick}.`);
        this.updateUserList();
    }

    exileCommand(args) {
        if (!this.canUseCommands(this.currentUser, 'moderator')) {
            this.addCommandResponse('❌ Nur VIPs, Admins oder temporäre SUPERUSER können User ins Exil werfen.');
            return;
        }

        if (args.length !== 1) {
            this.addCommandResponse('❌ Verwendung: /k <username>');
            return;
        }

        const targetUser = args[0];
        if (this.moveUserToExile(targetUser)) {
            this.addSystemMessage(this.currentRoom, `⚔️ ${targetUser} wurde von ${this.currentUser} ins Exil verbannt!`);
            this.addSystemMessage('exil', `⚔️ ${targetUser} wurde von ${this.currentUser} ins Exil verbannt!`);
            this.addCommandResponse(`✅ ${targetUser} ins Exil verbannt.`);
            this.updateUserList();
        } else {
            this.addCommandResponse(`❌ User "${targetUser}" nicht gefunden.`);
        }
    }

    banCommand(args) {
        if (this.userRole !== 'admin') {
            this.addCommandResponse('Nur Admins können User bannen.');
            return;
        }

        if (args.length !== 1) {
            this.addCommandResponse('Verwendung: /ban <username>');
            return;
        }

        const targetUser = args[0];
        if (!this.bannedUsers.includes(targetUser)) {
            this.bannedUsers.push(targetUser);
            this.removeUserFromAllRooms(targetUser);
            this.addSystemMessage(this.currentRoom, `${targetUser} wurde von ${this.currentUser} gebannt.`);
            this.updateUserList();
        } else {
            this.addCommandResponse(`${targetUser} ist bereits gebannt.`);
        }
    }

    muteCommand(args) {
        if (!['admin', 'moderator'].includes(this.userRole)) {
            this.addCommandResponse('Nur Admins und Moderatoren können User muten.');
            return;
        }

        if (args.length !== 1) {
            this.addCommandResponse('Verwendung: /mute <username>');
            return;
        }

        const targetUser = args[0];
        if (!this.mutedUsers.includes(targetUser)) {
            this.mutedUsers.push(targetUser);
            this.addSystemMessage(this.currentRoom, `${targetUser} wurde von ${this.currentUser} gemutet.`);
        } else {
            this.addCommandResponse(`${targetUser} ist bereits gemutet.`);
        }
    }

    unmuteCommand(args) {
        if (!['admin', 'moderator'].includes(this.userRole)) {
            this.addCommandResponse('Nur Admins und Moderatoren können User entmuten.');
            return;
        }

        if (args.length !== 1) {
            this.addCommandResponse('Verwendung: /unmute <username>');
            return;
        }

        const targetUser = args[0];
        const index = this.mutedUsers.indexOf(targetUser);
        if (index !== -1) {
            this.mutedUsers.splice(index, 1);
            this.addSystemMessage(this.currentRoom, `${targetUser} wurde von ${this.currentUser} entmutet.`);
        } else {
            this.addCommandResponse(`${targetUser} ist nicht gemutet.`);
        }
    }

    opCommand(args) {
        if (this.userRole !== 'admin') {
            this.addCommandResponse('Nur Admins können OP-Rechte vergeben.');
            return;
        }

        if (args.length !== 1) {
            this.addCommandResponse('Verwendung: /op <username>');
            return;
        }

        const targetUser = args[0];
        // This would update the user's role in a real implementation
        this.addSystemMessage(this.currentRoom, `${targetUser} erhielt Moderator-Rechte von ${this.currentUser}.`);
        this.addCommandResponse(`${targetUser} ist jetzt Moderator.`);
    }

    lockRoom() {
        if (this.userRole !== 'admin') {
            this.addCommandResponse('Nur Admins können Räume sperren.');
            return;
        }

        this.rooms[this.currentRoom].locked = true;
        this.addSystemMessage(this.currentRoom, `Raum wurde von ${this.currentUser} für normale User gesperrt.`);
    }

    unlockRoom() {
        if (this.userRole !== 'admin') {
            this.addCommandResponse('Nur Admins können Räume freigeben.');
            return;
        }

        this.rooms[this.currentRoom].locked = false;
        this.addSystemMessage(this.currentRoom, `Raum wurde von ${this.currentUser} wieder freigegeben.`);
    }

    listAllUsers() {
        this.addCommandResponse('=== ALLE USER ONLINE ===');
        Object.keys(this.roomUsers).forEach(roomId => {
            const users = this.roomUsers[roomId];
            if (users.length > 0) {
                this.addCommandResponse(`${this.rooms[roomId].name}: ${users.map(u => u.name).join(', ')}`);
            }
        });
    }

    listRooms() {
        this.addCommandResponse('=== VERFÜGBARE RÄUME ===');
        Object.keys(this.rooms).forEach(roomId => {
            const room = this.rooms[roomId];
            const userCount = (this.roomUsers[roomId] || []).length;
            const locked = room.locked ? ' [GESPERRT]' : '';
            this.addCommandResponse(`${room.name}: ${room.description} (${userCount} User)${locked}`);
        });
    }

    userInfoCommand(args) {
        if (args.length !== 1) {
            this.addCommandResponse('❌ Verwendung: /w <username>');
            return;
        }

        const targetUser = args[0];
        const userInfo = this.getUserInfo(targetUser);
        
        if (!userInfo) {
            this.addCommandResponse(`❌ User "${targetUser}" nicht gefunden.`);
            return;
        }

        // Single line format - only show SUPERUSER for VIP and Admin
        let superuserText = '';
        if (['admin', 'vip'].includes(userInfo.role)) {
            superuserText = ' - SUPERUSER';
        }
        
        const infoLine = `${userInfo.username} - chattet seit: ${userInfo.chattingSince} - still seit: ${userInfo.idleTime}${superuserText} - Punkte: ${userInfo.points} Punkte - im Raum: ${userInfo.room} - ${userInfo.roleDisplay}`;
        this.addCommandResponse(infoLine);
    }

    userInfoDetailedCommand(args) {
        if (args.length !== 1) {
            this.addCommandResponse('❌ Verwendung: /wc <username>');
            return;
        }

        const targetUser = args[0];
        const userInfo = this.getUserInfo(targetUser);
        
        if (!userInfo) {
            this.addCommandResponse(`❌ User "${targetUser}" nicht gefunden.`);
            return;
        }

        // Multi-line detailed format
        this.addCommandResponse(`${userInfo.username}`);
        this.addCommandResponse(`- chattet seit: ${userInfo.chattingSince}`);
        this.addCommandResponse(`- still seit: ${userInfo.idleTime}`);
        
        // Only show SUPERUSER line for VIP and Admin roles
        if (['admin', 'vip'].includes(userInfo.role)) {
            this.addCommandResponse(`- SUPERUSER`);
        }
        
        this.addCommandResponse(`- Punkte: ${userInfo.points} Punkte`);
        this.addCommandResponse(`- im Raum: ${userInfo.room}`);
        this.addCommandResponse(`- ${userInfo.roleDisplay}`);
    }

    getUserInfo(username) {
        // Find user in any room
        let foundUser = null;
        let userRoom = null;
        
        Object.keys(this.roomUsers).forEach(roomId => {
            const user = this.roomUsers[roomId].find(u => u.name.toLowerCase() === username.toLowerCase());
            if (user) {
                foundUser = user;
                userRoom = roomId;
            }
        });

        if (!foundUser) {
            return null;
        }

        // Calculate chat time
        const joinTime = foundUser.joinTime || new Date();
        const now = new Date();
        const chattingMinutes = Math.floor((now - joinTime) / 60000);
        const chattingHours = Math.floor(chattingMinutes / 60);
        const chattingMins = chattingMinutes % 60;
        const chattingSince = `${chattingHours.toString().padStart(2, '0')}:${chattingMins.toString().padStart(2, '0')} Uhr`;

        // Calculate idle time
        const isAway = this.awayUsers.includes(foundUser.name);
        const idleTime = isAway ? this.getIdleTime(foundUser.name) : '0 Minuten';

        // Get points (mock data or from backend if available)
        const points = this.getUserPoints(foundUser.name);

        // Get room name
        const room = this.rooms[userRoom]?.name || 'Unbekannt';

        // Get role display with SUPERUSER prefix for VIP/Admin
        const roleDisplay = this.getRoleDisplayName(foundUser.role);

        return {
            username: foundUser.name,
            chattingSince,
            idleTime,
            points,
            room,
            roleDisplay,
            role: foundUser.role
        };
    }

    getRoleDisplayName(role) {
        switch (role) {
            case 'admin':
                return 'SUPERUSER ADMIN';
            case 'vip':
                return 'SUPERUSER VIP';
            case 'moderator':
                return 'FOREN MODERATOR';
            default:
                return 'USER';
        }
    }

    getIdleTime(username) {
        // Calculate idle time for away users
        if (!this.awayTimes) this.awayTimes = {};
        
        if (this.awayTimes[username]) {
            const now = new Date();
            const awayTime = this.awayTimes[username];
            const idleMinutes = Math.floor((now - awayTime) / 60000);
            return `${idleMinutes} Minuten`;
        }
        
        return '2 Minuten'; // Default idle time
    }

    getUserPoints(username) {
        // Mock points system - in real system this would come from backend
        if (!this.userPoints) this.userPoints = {};
        
        if (!this.userPoints[username]) {
            // Generate mock points based on username hash for consistency
            let hash = 0;
            for (let i = 0; i < username.length; i++) {
                const char = username.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            this.userPoints[username] = Math.abs(hash) % 10000 + 100; // 100-10100 points
        }
        
        return this.userPoints[username];
    }

    whoCompleteCommand() {
        // Renamed from the old whoCompleteCommand to avoid confusion
        this.addCommandResponse('=== ALLE USER IN ALLEN RÄUMEN ===');
        let totalUsers = 0;
        Object.keys(this.roomUsers).forEach(roomId => {
            const users = this.roomUsers[roomId];
            if (users.length > 0) {
                totalUsers += users.length;
                const userList = users.map(user => {
                    const roleIcon = this.getRoleIcon(user.role);
                    const awayStatus = this.awayUsers.includes(user.name) ? ' (away)' : '';
                    return `${roleIcon}${user.displayName || user.name}${awayStatus}`;
                }).join(', ');
                this.addCommandResponse(`${this.rooms[roomId].name}: ${userList}`);
            }
        });
        this.addCommandResponse(`Total: ${totalUsers} User online`);
    }

    friendRequestCommand(args) {
        // Available for ALL users now
        if (args.length !== 1) {
            this.addCommandResponse('❌ Verwendung: /f+ <username>');
            return;
        }

        const targetUser = args[0];
        if (this.isUserOnline(targetUser)) {
            this.addSystemMessage(this.currentRoom, `📨 ${this.currentUser} hat eine Freundschaftsanfrage an ${targetUser} gesendet.`);
            this.addCommandResponse(`✅ Freundschaftsanfrage an ${targetUser} gesendet!`);
            
            // Store friend request for acceptance
            if (!this.friendRequests) this.friendRequests = [];
            this.friendRequests.push({
                from: this.currentUser,
                to: targetUser,
                time: new Date()
            });
        } else {
            this.addCommandResponse(`❌ User "${targetUser}" ist nicht online.`);
        }
    }

    acceptFriendCommand() {
        // Available for ALL users now
        if (!this.friendRequests) this.friendRequests = [];
        
        // Find latest friend request for current user
        const request = this.friendRequests
            .filter(req => req.to === this.currentUser)
            .sort((a, b) => b.time - a.time)[0];

        if (request) {
            this.addSystemMessage(this.currentRoom, `💚 ${this.currentUser} und ${request.from} sind jetzt Freunde!`);
            this.addCommandResponse(`✅ Freundschaftsanfrage von ${request.from} angenommen!`);
            
            // Remove accepted request
            this.friendRequests = this.friendRequests.filter(req => req !== request);
        } else {
            this.addCommandResponse('❌ Keine ausstehenden Freundschaftsanfragen gefunden.');
        }
    }

    inviteCommand(args) {
        if (!['vip', 'admin'].includes(this.userRole)) {
            this.addCommandResponse('❌ Nur SUPERUSER (VIPs und Admins) können User einladen.');
            return;
        }

        if (args.length !== 1) {
            this.addCommandResponse('❌ Verwendung: /i <username>');
            return;
        }

        const targetUser = args[0];
        if (this.isUserOnline(targetUser)) {
            this.addSystemMessage(this.currentRoom, `📨 ${targetUser} wurde von ${this.currentUser} in den Raum "${this.rooms[this.currentRoom].name}" eingeladen!`);
            this.addCommandResponse(`✅ Einladung an ${targetUser} gesendet!`);
        } else {
            this.addCommandResponse(`❌ User "${targetUser}" ist nicht online.`);
        }
    }

    temporarySuperuserCommand(args) {
        if (!['vip', 'admin'].includes(this.userRole)) {
            this.addCommandResponse('❌ Nur VIPs und Admins können temporäre SUPERUSER-Rechte verleihen.');
            return;
        }

        if (args.length !== 1) {
            this.addCommandResponse('❌ Verwendung: /su <username>');
            return;
        }

        const targetUser = args[0];
        
        // Check if user is online
        if (!this.isUserOnline(targetUser)) {
            this.addCommandResponse(`❌ User "${targetUser}" ist nicht online.`);
            return;
        }

        // Check if user already has temporary SUPERUSER rights
        if (this.temporarySuperusers.includes(targetUser)) {
            this.addCommandResponse(`⚠️ ${targetUser} hat bereits temporäre SUPERUSER-Rechte.`);
            return;
        }

        // Check if user is already VIP/Admin (permanent rights)
        const userInfo = this.getUserInfo(targetUser);
        if (userInfo && ['vip', 'admin'].includes(userInfo.role)) {
            this.addCommandResponse(`⚠️ ${targetUser} hat bereits permanente ${userInfo.roleDisplay}-Rechte.`);
            return;
        }

        // Grant temporary SUPERUSER rights
        this.temporarySuperusers.push(targetUser);
        
        this.addSystemMessage(this.currentRoom, `⭐ ${targetUser} erhielt temporäre SUPERUSER-Rechte von ${this.currentUser}! (Gültig nur in dieser Chat-Session)`);
        this.addCommandResponse(`✅ ${targetUser} hat jetzt temporäre SUPERUSER-Rechte (Chat-Commands: /k, /gag, etc.)`);
        
        // Update user list to show temporary status
        this.updateUserList();
    }

    removeTemporarySuperuserCommand(args) {
        if (!['vip', 'admin'].includes(this.userRole)) {
            this.addCommandResponse('❌ Nur VIPs und Admins können temporäre SUPERUSER-Rechte entziehen.');
            return;
        }

        if (args.length !== 1) {
            this.addCommandResponse('❌ Verwendung: /rsu <username>');
            return;
        }

        const targetUser = args[0];
        
        // Check if user has temporary SUPERUSER rights
        const index = this.temporarySuperusers.indexOf(targetUser);
        if (index === -1) {
            this.addCommandResponse(`⚠️ ${targetUser} hat keine temporären SUPERUSER-Rechte.`);
            return;
        }

        // Remove temporary SUPERUSER rights
        this.temporarySuperusers.splice(index, 1);
        
        this.addSystemMessage(this.currentRoom, `👤 ${targetUser} verlor temporäre SUPERUSER-Rechte durch ${this.currentUser}.`);
        this.addCommandResponse(`✅ ${targetUser} hat keine temporären SUPERUSER-Rechte mehr.`);
        
        // Update user list
        this.updateUserList();
    }

    // Helper function to check if user has SUPERUSER rights (temporary or permanent)
    hasTemporarySuperuserRights(username) {
        return this.temporarySuperusers.includes(username);
    }

    // Helper function to check if user can use moderation commands
    canUseCommands(username, requiredLevel) {
        const userInfo = this.getUserInfo(username);
        
        // Check permanent roles
        if (userInfo) {
            if (requiredLevel === 'admin' && userInfo.role === 'admin') return true;
            if (requiredLevel === 'vip' && ['vip', 'admin'].includes(userInfo.role)) return true;
            // Forum moderators can NOT use chat moderation commands, only VIP and Admin
            if (requiredLevel === 'moderator' && ['vip', 'admin'].includes(userInfo.role)) return true;
        }
        
        // Check temporary SUPERUSER rights for moderation commands
        if (requiredLevel === 'moderator' && this.hasTemporarySuperuserRights(username)) {
            return true;
        }
        
        return false;
    }

    gagCommand(args) {
        // Check permissions: VIP, Admin, or temporary SUPERUSER (NOT Forum Moderators)
        if (!this.canUseCommands(this.currentUser, 'moderator')) {
            this.addCommandResponse('❌ Nur VIPs, Admins oder temporäre SUPERUSER können User stumm schalten.');
            return;
        }

        if (args.length < 1) {
            this.addCommandResponse('❌ Verwendung: /gag <username> [minuten]');
            return;
        }

        const targetUser = args[0];
        const minutes = args[1] ? parseInt(args[1]) : 5;

        if (isNaN(minutes) || minutes < 1) {
            this.addCommandResponse('❌ Ungültige Anzahl Minuten.');
            return;
        }

        if (this.isUserOnline(targetUser)) {
            if (!this.gaggedUsers) this.gaggedUsers = {};
            this.gaggedUsers[targetUser] = Date.now() + (minutes * 60 * 1000);
            
            this.addSystemMessage(this.currentRoom, `🔇 ${targetUser} wurde von ${this.currentUser} für ${minutes} Minuten stumm geschaltet.`);
            this.addCommandResponse(`✅ ${targetUser} für ${minutes} Minuten geaggt.`);
        } else {
            this.addCommandResponse(`❌ User "${targetUser}" ist nicht online.`);
        }
    }

    temporaryBanCommand(args) {
        // Only VIP and Admin can use /kh, not temporary SUPERUSER
        if (!['vip', 'admin'].includes(this.userRole)) {
            this.addCommandResponse('❌ Nur VIPs und Admins können User temporär aus dem Chat werfen.');
            return;
        }

        if (args.length !== 2) {
            this.addCommandResponse('❌ Verwendung: /kh <username> <minuten>');
            return;
        }

        const targetUser = args[0];
        const minutes = parseInt(args[1]);

        if (isNaN(minutes) || minutes <= 0) {
            this.addCommandResponse('❌ Ungültige Minutenangabe.');
            return;
        }

        const userInfo = this.getUserInfo(targetUser);
        if (userInfo) {
            // In the frontend simulation, we'll just show a message
            this.addSystemMessage(this.currentRoom, `🚫 ${targetUser} wurde von ${this.currentUser} für ${minutes} Minuten aus dem Chat geworfen.`);
            this.addCommandResponse(`✅ ${targetUser} für ${minutes} Minuten aus dem Chat geworfen.`);
            
            // Remove user from user list temporarily
            Object.keys(this.roomUsers).forEach(room => {
                this.roomUsers[room] = this.roomUsers[room].filter(user => user.name !== targetUser);
            });
            this.updateUserList();
        } else {
            this.addCommandResponse(`❌ User "${targetUser}" ist nicht online.`);
        }
    }

    setRoomTopicCommand(args) {
        // Check if user can set room topics (VIP, Admin, or temporary SUPERUSER)
        if (!['vip', 'admin'].includes(this.userRole) && !this.hasTemporarySuperuserRights(this.currentUser)) {
            this.addCommandResponse('❌ Nur VIPs, Admins oder temporäre SUPERUSER können Raumthemen setzen.');
            return;
        }

        if (args.length === 0) {
            this.addCommandResponse('❌ Verwendung: /t <raumthema>');
            return;
        }

        const topic = args.join(' ');
        
        // Set room topic
        if (!this.roomTopics) this.roomTopics = {};
        this.roomTopics[this.currentRoom] = {
            topic: topic,
            setBy: this.currentUser,
            setAt: new Date()
        };

        // Update room info display
        document.getElementById('roomInfo').textContent = `${this.rooms[this.currentRoom].name} - ${topic}`;

        this.addSystemMessage(this.currentRoom, `📋 Raumthema gesetzt von ${this.currentUser}: "${topic}"`);
        this.addCommandResponse(`✅ Raumthema gesetzt: "${topic}"`);
    }

    moveUserToExile(username) {
        let userMoved = false;
        
        // Remove user from current room and add to exile
        Object.keys(this.roomUsers).forEach(roomId => {
            const userIndex = this.roomUsers[roomId].findIndex(u => u.name.toLowerCase() === username.toLowerCase());
            if (userIndex !== -1 && roomId !== 'exil') {
                const user = this.roomUsers[roomId][userIndex];
                this.roomUsers[roomId].splice(userIndex, 1);
                
                // Add to exile room
                if (!this.roomUsers['exil']) this.roomUsers['exil'] = [];
                this.roomUsers['exil'].push(user);
                userMoved = true;
            }
        });
        
        return userMoved;
    }

    lockRoomCommand(args) {
        if (this.userRole !== 'admin') {
            this.addCommandResponse('❌ Nur Admins können Räume sperren.');
            return;
        }

        let roomToLock = this.currentRoom;
        if (args.length > 0) {
            const roomName = args.join(' ').toLowerCase();
            const roomEntry = Object.entries(this.rooms).find(([id, room]) => 
                room.name.toLowerCase() === roomName
            );
            if (roomEntry) {
                roomToLock = roomEntry[0];
            } else {
                this.addCommandResponse(`❌ Raum "${roomName}" nicht gefunden.`);
                return;
            }
        }

        this.rooms[roomToLock].locked = !this.rooms[roomToLock].locked;
        const action = this.rooms[roomToLock].locked ? 'gesperrt' : 'freigegeben';
        
        this.addSystemMessage(roomToLock, `🔒 Raum "${this.rooms[roomToLock].name}" wurde ${action} von ${this.currentUser}.`);
        this.addCommandResponse(`✅ Raum "${this.rooms[roomToLock].name}" ${action}.`);
    }

    moderateRoom() {
        if (!['vip', 'moderator', 'admin'].includes(this.userRole)) {
            this.addCommandResponse('❌ Nur VIPs und höher können Räume moderieren.');
            return;
        }

        this.rooms[this.currentRoom].moderated = true;
        this.addSystemMessage(this.currentRoom, `🛡️ Raum wird jetzt moderiert von ${this.currentUser}. Alle Nachrichten müssen freigegeben werden.`);
        this.addCommandResponse(`✅ Raum-Moderation aktiviert.`);
    }

    unmoderateRoom() {
        if (!['vip', 'moderator', 'admin'].includes(this.userRole)) {
            this.addCommandResponse('❌ Nur VIPs und höher können Moderation aufheben.');
            return;
        }

        this.rooms[this.currentRoom].moderated = false;
        this.addSystemMessage(this.currentRoom, `🗣️ Raum-Moderation wurde deaktiviert von ${this.currentUser}. Alle können wieder frei schreiben.`);
        this.addCommandResponse(`✅ Raum-Moderation deaktiviert.`);
    }

    statusCommand() {
        const uptime = new Date() - (this.loginTime || new Date());
        const uptimeStr = Math.floor(uptime / 60000);
        
        this.addCommandResponse('=== MEIN STATUS ===');
        this.addCommandResponse(`Benutzername: ${this.currentUser}`);
        this.addCommandResponse(`Rolle: ${this.userRole.toUpperCase()}`);
        this.addCommandResponse(`Aktueller Raum: ${this.rooms[this.currentRoom].name}`);
        this.addCommandResponse(`Online seit: ${uptimeStr} Minuten`);
        this.addCommandResponse(`Status: ${this.awayUsers.includes(this.currentUser) ? 'Abwesend' : 'Anwesend'}`);
    }

    privateMessageCommand(args) {
        if (args.length < 2) {
            this.addCommandResponse('❌ Verwendung: /pm <username> <nachricht>');
            return;
        }

        const targetUser = args[0];
        const message = args.slice(1).join(' ');

        // In a real implementation, this would send via API
        this.addCommandResponse(`📧 Private Nachricht an ${targetUser} gesendet: "${message}"`);
    }

    createPrivateRoomCommand(args) {
        if (args.length === 0) {
            this.addCommandResponse('❌ Verwendung: /sepa <raumname>');
            return;
        }

        const roomName = args.join(' ');
        
        // Validate room name
        if (roomName.length < 2) {
            this.addCommandResponse('❌ Raumname muss mindestens 2 Zeichen lang sein.');
            return;
        }

        if (roomName.length > 30) {
            this.addCommandResponse('❌ Raumname darf maximal 30 Zeichen lang sein.');
            return;
        }

        // Create private room via backend API (if available)
        // For now, simulate the creation
        this.addSystemMessage(this.currentRoom, `🔒 ${this.currentUser} hat den privaten Raum "${roomName}" erstellt.`);
        this.addCommandResponse(`✅ Privater Raum "${roomName}" erstellt! Sie haben automatisch temporäre SUPERUSER-Rechte für 2 Stunden.`);
        
        // Grant temporary superuser rights to creator
        if (!this.temporarySuperusers.includes(this.currentUser)) {
            this.temporarySuperusers.push(this.currentUser);
            this.addCommandResponse(`⚡ Ihnen wurden temporäre SUPERUSER-Rechte gewährt.`);
        }
        
        // Update user list to show superuser indicator
        this.updateUserList();
        
        // Add room to available rooms (simulate)
        const roomItem = document.createElement('div');
        roomItem.className = 'room-item private-room';
        roomItem.innerHTML = `🔒 ${roomName} (Privat)`;
        roomItem.style.cssText = `
            padding: 5px 10px;
            margin: 2px 0;
            background: #003366;
            border: 1px solid #0066cc;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
            color: #ffffff;
        `;
        
        // Add click handler to switch to private room
        roomItem.addEventListener('click', () => {
            this.switchRoom(roomName);
        });
        
        // Add to room list
        const roomList = document.getElementById('roomList');
        if (roomList) {
            roomList.appendChild(roomItem);
        }
    }

    ignoreCommand(args) {
        if (args.length !== 1) {
            this.addCommandResponse('❌ Verwendung: /ignore <username>');
            return;
        }
        
        if (!this.ignoredUsers) this.ignoredUsers = [];
        const targetUser = args[0];
        
        if (!this.ignoredUsers.includes(targetUser)) {
            this.ignoredUsers.push(targetUser);
            this.addCommandResponse(`🚫 ${targetUser} wird jetzt ignoriert.`);
        } else {
            this.addCommandResponse(`⚠️ ${targetUser} wird bereits ignoriert.`);
        }
    }

    unignoreCommand(args) {
        if (args.length !== 1) {
            this.addCommandResponse('❌ Verwendung: /unignore <username>');
            return;
        }
        
        if (!this.ignoredUsers) this.ignoredUsers = [];
        const targetUser = args[0];
        const index = this.ignoredUsers.indexOf(targetUser);
        
        if (index !== -1) {
            this.ignoredUsers.splice(index, 1);
            this.addCommandResponse(`✅ ${targetUser} wird nicht mehr ignoriert.`);
        } else {
            this.addCommandResponse(`⚠️ ${targetUser} wird nicht ignoriert.`);
        }
    }

    addMessage(room, user, text, type = 'normal') {
        if (!this.messages[room]) this.messages[room] = [];

        const message = {
            id: Date.now() + Math.random(),
            user: user,
            text: text,
            time: new Date(),
            type: type,
            color: this.customColors[user] || null
        };

        this.messages[room].push(message);

        // Keep only last 100 messages per room
        if (this.messages[room].length > 100) {
            this.messages[room] = this.messages[room].slice(-100);
        }
    }

    addSystemMessage(room, text) {
        this.addMessage(room, 'System', text, 'system');
    }

    addCommandResponse(text) {
        this.addMessage(this.currentRoom, 'System', text, 'command');
    }

    addPrivateMessage(from, to, text) {
        // In a real implementation, this would send to the target user
        this.addMessage(this.currentRoom, from, `[PM zu ${to}] ${text}`, 'private');
    }

    isUserOnline(username) {
        return Object.values(this.roomUsers).some(users => 
            users.some(user => user.name.toLowerCase() === username.toLowerCase())
        );
    }

    removeUserFromRoom(username, room) {
        const users = this.roomUsers[room] || [];
        const index = users.findIndex(user => user.name.toLowerCase() === username.toLowerCase());
        if (index !== -1) {
            users.splice(index, 1);
            return true;
        }
        return false;
    }

    removeUserFromAllRooms(username) {
        Object.keys(this.roomUsers).forEach(room => {
            this.removeUserFromRoom(username, room);
        });
    }

    updateDisplay() {
        const container = document.getElementById('messagesContainer');
        const messages = this.messages[this.currentRoom] || [];
        
        container.innerHTML = '';
        
        messages.forEach(message => {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'message';
            
            const timeStr = message.time.toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            let messageHtml = `<span class="message-time">[${timeStr}]</span> `;
            
            switch (message.type) {
                case 'system':
                    msgDiv.className += ' system-message';
                    messageHtml += `<span class="message-text">${message.text}</span>`;
                    break;
                case 'command':
                    msgDiv.className += ' command-response';
                    messageHtml += `<span class="message-text">${message.text}</span>`;
                    break;
                case 'private':
                    msgDiv.className += ' private-message';
                    messageHtml += `<span class="message-user">${message.user}:</span><span class="message-text">${message.text}</span>`;
                    break;
                case 'action':
                    messageHtml += `<span class="message-text" style="color: #ffaa00; font-style: italic;">${message.text}</span>`;
                    break;
                default:
                    const userColor = this.getUserColor(message.user);
                    const textColor = message.color || '#ffffff';
                    messageHtml += `<span class="message-user" style="color: ${userColor};">${message.user}:</span>`;
                    messageHtml += `<span class="message-text" style="color: ${textColor};"> ${message.text}</span>`;
            }
            
            msgDiv.innerHTML = messageHtml;
            container.appendChild(msgDiv);
        });
        
        // Auto-scroll to bottom
        container.scrollTop = container.scrollHeight;
        
        this.updateUserList();
    }

    getUserColor(username) {
        const users = this.roomUsers[this.currentRoom] || [];
        const user = users.find(u => u.name === username);
        if (!user) return '#00ff00';
        
        switch (user.role) {
            case 'admin': return '#ff0000';
            case 'moderator': return '#ffaa00';
            case 'vip': return '#ff00ff';
            default: return '#00ff00';
        }
    }

    updateUserList() {
        const userList = document.getElementById('userList');
        const users = this.roomUsers[this.currentRoom] || [];
        
        userList.innerHTML = '';
        
        // Sort users by role hierarchy
        const sortedUsers = users.sort((a, b) => {
            const roleOrder = { admin: 0, moderator: 1, vip: 2, user: 3 };
            return roleOrder[a.role] - roleOrder[b.role];
        });
        
        sortedUsers.forEach(user => {
            const userDiv = document.createElement('div');
            userDiv.className = `user-item user-${user.role}`;
            
            const isAway = this.awayUsers.includes(user.name);
            const statusIcon = isAway ? '💤' : '●';
            const roleIcon = this.getRoleIcon(user.role);
            
            // Check for temporary SUPERUSER rights
            const hasTemporaryRights = this.hasTemporarySuperuserRights(user.name);
            const tempIndicator = hasTemporaryRights ? ' ⚡' : '';
            
            // Use displayName if available, otherwise fall back to name
            userDiv.innerHTML = `${statusIcon} ${roleIcon} ${user.displayName || user.name}${tempIndicator}`;
            
            // Add click event for user profile (including own profile)
            userDiv.addEventListener('click', () => {
                window.showUserProfile(user.name);
            });
            
            userList.appendChild(userDiv);
        });
        
        // Update user count
        document.getElementById('userCount').textContent = `Benutzer: ${users.length}`;
    }

    getRoleIcon(role) {
        switch (role) {
            case 'admin': return '👑';
            case 'moderator': return '🛡️';
            case 'vip': return '⭐';
            default: return '';
        }
    }

    startClock() {
        const updateTime = () => {
            const now = new Date();
            document.getElementById('statusTime').textContent = now.toLocaleTimeString('de-DE');
        };
        
        updateTime();
        setInterval(updateTime, 1000);
    }

    simulateUsers() {
        // Add some bot users for demonstration
        const botUsers = [
            { name: 'ChatBot', role: 'admin' },
            { name: 'GameMaster', role: 'moderator' },
            { name: 'MusicLover', role: 'vip' },
            { name: 'Newbie123', role: 'user' },
            { name: 'ProGamer', role: 'user' }
        ];

        // Distribute bots across rooms
        botUsers.forEach((bot, index) => {
            const rooms = Object.keys(this.rooms);
            const roomIndex = index % rooms.length;
            const room = rooms[roomIndex];
            
            // Add moderation indicator for VIPs, Admins, and Forum Moderators
            let displayName = bot.name;
            if (['vip', 'admin', 'moderator'].includes(bot.role)) {
                displayName += ' (c)';
            }
            
            if (!this.roomUsers[room]) this.roomUsers[room] = [];
            this.roomUsers[room].push({
                name: bot.name,
                displayName: displayName,
                role: bot.role,
                status: 'online',
                joinTime: new Date()
            });
        });

        // Add welcome messages from bots
        setTimeout(() => {
            this.addMessage('hauptraum', 'ChatBot', 'Willkommen alle! Der Chat ist bereit. 🤖');
        }, 2000);

        setTimeout(() => {
            this.addMessage('gaming', 'ProGamer', 'Wer hat Lust auf eine Runde CS? 🎮');
        }, 5000);
    }

    simulateActivity() {
        // Randomly add some bot messages
        if (Math.random() < 0.3) {
            const messages = [
                'Wie geht es euch heute?',
                'Hat jemand Lust zu chatten?',
                'Schönes Wetter draußen! ☀️',
                'Was hört ihr für Musik? 🎵',
                'Jemand online?'
            ];
            
            const botNames = ['ChatBot', 'GameMaster', 'MusicLover'];
            const randomBot = botNames[Math.floor(Math.random() * botNames.length)];
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            
            // Add to a random room where the bot exists
            Object.keys(this.roomUsers).forEach(room => {
                const users = this.roomUsers[room];
                if (users.some(user => user.name === randomBot)) {
                    this.addMessage(room, randomBot, randomMessage);
                    if (room === this.currentRoom) {
                        this.updateDisplay();
                    }
                }
            });
        }
    }
}

// User Profile Functions
async function showUserProfile(username) {
    if (!chat || !username) return;
    
    chat.currentProfileUser = username;
    document.getElementById('profileUsername').textContent = `${username} - Profil`;
    
    // Show modal
    document.getElementById('userProfileModal').style.display = 'flex';
    
    // Load user info
    await loadUserProfileInfo(username);
    
    // Load guestbook
    await loadUserGuestbook(username);
}

function closeUserProfile() {
    document.getElementById('userProfileModal').style.display = 'none';
    document.getElementById('addGuestbookForm').style.display = 'none';
    chat.currentProfileUser = null;
}

async function loadUserProfileInfo(username) {
    const userInfo = chat.getUserInfo(username);
    const infoContainer = document.getElementById('userProfileInfo');
    
    if (!userInfo) {
        infoContainer.innerHTML = '❌ User nicht gefunden.';
        return;
    }
    
    // Try to get additional profile info from backend
    let profileData = null;
    if (chat.authToken) {
        try {
            const response = await fetch(`${chat.backendUrl}/api/users/${username}/profile`, {
                headers: {
                    'Authorization': `Bearer ${chat.authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                profileData = await response.json();
            }
        } catch (error) {
            console.log('Could not load backend profile data:', error);
        }
    }
    
    // Display user info
    let html = `
        <div><strong>🏷️ Username:</strong> ${userInfo.username}</div>
        <div><strong>👑 Rolle:</strong> ${userInfo.roleDisplay}</div>
        <div><strong>🏆 Punkte:</strong> ${userInfo.points} Punkte</div>
        <div><strong>🏠 Aktueller Raum:</strong> ${userInfo.room}</div>
        <div><strong>⏰ Online seit:</strong> ${userInfo.chattingSince}</div>
        <div><strong>😴 Still seit:</strong> ${userInfo.idleTime}</div>
    `;
    
    if (profileData) {
        html += `<div style="margin-top: 10px; border-top: 1px solid #00ff00; padding-top: 10px;">`;
        if (profileData.bio) {
            html += `<div><strong>📝 Bio:</strong> ${profileData.bio}</div>`;
        }
        if (profileData.location) {
            html += `<div><strong>📍 Ort:</strong> ${profileData.location}</div>`;
        }
        if (profileData.website) {
            html += `<div><strong>🌐 Website:</strong> <a href="${profileData.website}" target="_blank" style="color: #00ffff;">${profileData.website}</a></div>`;
        }
        if (profileData.social_links) {
            const social = profileData.social_links;
            if (social.twitter) html += `<div><strong>🐦 Twitter:</strong> <a href="https://twitter.com/${social.twitter}" target="_blank" style="color: #00ffff;">@${social.twitter}</a></div>`;
            if (social.instagram) html += `<div><strong>📸 Instagram:</strong> <a href="https://instagram.com/${social.instagram}" target="_blank" style="color: #00ffff;">@${social.instagram}</a></div>`;
            if (social.github) html += `<div><strong>💻 GitHub:</strong> <a href="https://github.com/${social.github}" target="_blank" style="color: #00ffff;">@${social.github}</a></div>`;
        }
        html += `</div>`;
    }
    
    infoContainer.innerHTML = html;
}

async function loadUserGuestbook(username) {
    const guestbookContainer = document.getElementById('guestbookEntries');
    guestbookContainer.innerHTML = '<div style="color: #ffff00;">Lade Gästebuch...</div>';
    
    if (!chat.authToken) {
        guestbookContainer.innerHTML = '<div style="color: #ff9999;">❌ Nicht authentifiziert - Gästebuch nicht verfügbar.</div>';
        document.getElementById('addGuestbookEntryBtn').style.display = 'none';
        return;
    }
    
    try {
        const response = await fetch(`${chat.backendUrl}/api/users/${username}/guestbook`, {
            headers: {
                'Authorization': `Bearer ${chat.authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load guestbook');
        }
        
        const guestbookData = await response.json();
        const entries = guestbookData.entries || [];
        
        if (entries.length === 0) {
            guestbookContainer.innerHTML = '<div style="color: #888888; text-align: center; padding: 20px;">📝 Keine Gästebuch-Einträge vorhanden.</div>';
            return;
        }
        
        let html = '';
        entries.forEach((entry, index) => {
            const date = new Date(entry.created_at).toLocaleString('de-DE');
            const isOwnEntry = entry.author_name === chat.currentUser;
            const isPrivate = entry.is_private;
            
            // Private entry indicator
            const privateIndicator = isPrivate ? '<span style="color: #ff6600; font-size: 9px;">🔒 PRIVAT</span> ' : '';
            
            html += `
                <div style="background: #001122; border: 1px solid ${isPrivate ? '#ff6600' : '#003366'}; padding: 10px; margin-bottom: 8px; border-radius: 3px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <strong style="color: ${isOwnEntry ? '#00ffff' : '#ffff00'};">
                            ${privateIndicator}${entry.author_name || 'Anonym'}
                        </strong>
                        <span style="color: #666699; font-size: 10px;">${date}</span>
                    </div>
                    <div style="color: #ffffff; line-height: 1.3;">
                        ${entry.message.replace(/\n/g, '<br>')}
                    </div>
                </div>
            `;
        });
        
        guestbookContainer.innerHTML = html;
        
        // Check if current user can add guestbook entries (now always true)
        const addEntryBtn = document.getElementById('addGuestbookEntryBtn');
        if (chat.authToken) {
            // Always show guestbook add button - users can write in their own guestbook now
            addEntryBtn.style.display = 'inline-block';
            addEntryBtn.onclick = showAddGuestbookEntry;
        } else {
            addEntryBtn.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Error loading guestbook:', error);
        guestbookContainer.innerHTML = '<div style="color: #ff9999;">❌ Fehler beim Laden des Gästebuchs.</div>';
    }
}

function showAddGuestbookEntry() {
    if (!chat.currentProfileUser) return;
    
    document.getElementById('addGuestbookForm').style.display = 'block';
    document.getElementById('guestbookMessage').focus();
}

function cancelGuestbookEntry() {
    document.getElementById('addGuestbookForm').style.display = 'none';
    document.getElementById('guestbookMessage').value = '';
    document.getElementById('guestbookPrivateCheckbox').checked = false;
}

async function submitGuestbookEntry() {
    const message = document.getElementById('guestbookMessage').value.trim();
    const isPrivate = document.getElementById('guestbookPrivateCheckbox').checked;
    
    if (!message || !chat.currentProfileUser || !chat.authToken) {
        return;
    }
    
    try {
        const response = await fetch(`${chat.backendUrl}/api/users/${chat.currentProfileUser}/guestbook`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${chat.authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                message: message,
                is_private: isPrivate
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to submit guestbook entry');
        }
        
        // Success
        document.getElementById('guestbookMessage').value = '';
        document.getElementById('guestbookPrivateCheckbox').checked = false;
        document.getElementById('addGuestbookForm').style.display = 'none';
        
        // Reload guestbook
        await loadUserGuestbook(chat.currentProfileUser);
        
        // Show success message
        const privacyText = isPrivate ? ' (Privat)' : '';
        chat.addCommandResponse(`✅ Gästebuch-Eintrag${privacyText} für ${chat.currentProfileUser} erfolgreich hinzugefügt!`);
        
    } catch (error) {
        console.error('Error submitting guestbook entry:', error);
        alert('❌ Fehler beim Senden des Gästebuch-Eintrags.');
    }
}

function closeHelpModal() {
    document.getElementById('helpModal').style.display = 'none';
}

function leaveChatToDashboard() {
    if (confirm('Chat verlassen und zum Dashboard zurückkehren?')) {
        // Navigate back to dashboard
        if (window.location.hostname.includes('preview.emergentagent.com')) {
            window.location.href = '/community';
        } else {
            window.location.href = '/';
        }
    }
}

// Initialize chat when page loads
let chat;

function login() {
    if (!chat) {
        chat = new RichChat();
    }
    
    // Manual login (fallback)
    chat.login();
}

function sendMessage() {
    if (chat) {
        chat.sendMessage();
    }
}

// Auto-focus on username input when page loads
window.addEventListener('load', () => {
    // Initialize chat system
    if (!chat) {
        chat = new RichChat();
    }
    
    // Focus username input as fallback
    const usernameInput = document.getElementById('loginUsername');
    if (usernameInput) {
        usernameInput.focus();
    }
});