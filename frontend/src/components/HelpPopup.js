import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { MessageSquare, Crown, Star, Shield, User, Zap } from 'lucide-react';

const HelpPopup = ({ trigger, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);

  const helpContent = {
    roles: [
      {
        icon: <Crown className="w-5 h-5 text-red-400" />,
        title: "👑 ADMIN (Höchste Berechtigung)",
        color: "text-red-400",
        permissions: [
          "Vollzugriff: Alle Chat- und System-Funktionen",
          "User-Management: Kann alle Rollen vergeben und entziehen",
          "Raum-Kontrolle: Kann alle Räume sperren/entsperren",
          "Moderation: Kicken, Bannen, Muten aller User",
          "SUPERUSER-Verwaltung: Kann temporäre SUPERUSER ernennen",
          "Besonderes: Permanente Rechte, können nicht degradiert werden"
        ]
      },
      {
        icon: <Star className="w-5 h-5 text-purple-400" />,
        title: "⭐ VIP (SUPERUSER-Status)",
        color: "text-purple-400",
        permissions: [
          "Erweiterte Rechte: Alle VIP-Features und Chat-Moderation",
          "Personalisierung: Textfarbe ändern (/col), Nickname ändern (/nick)",
          "Soziale Features: Freundschaftsanfragen senden (/f+)",
          "Chat-Einladungen: User in Räume einladen (/i)",
          "SUPERUSER-Verwaltung: Kann temporäre SUPERUSER ernennen",
          "Moderation: Kicken (/k), Gaggen (/gag), Temp-Ban (/kh) von Usern"
        ]
      },
      {
        icon: <Shield className="w-5 h-5 text-blue-400" />,
        title: "🛡️ FOREN MODERATOR",
        color: "text-blue-400",
        permissions: [
          "Forum-Verwaltung: Moderation der Forum-Bereiche",
          "Chat-Moderation: Basis-Moderationsbefehle (Kick, Gag)",
          "Kein SUPERUSER: Keine erweiterten VIP-Features",
          "Spezialrolle: Fokus auf Community-Moderation",
          "Begrenzte Rechte: Kann keine SUPERUSER ernennen"
        ]
      },
      {
        icon: <Zap className="w-5 h-5 text-yellow-400" />,
        title: "⚡ TEMPORÄRE SUPERUSER",
        color: "text-yellow-400",
        permissions: [
          "Zeitlich begrenzt: Nur für aktuelle Chat-Session gültig",
          "Moderation: Kann User kicken (/k) und gaggen (/gag)",
          "Vergeben durch: VIPs und Admins mit /su command",
          "Erkennung: ⚡ Symbol neben dem Namen in User-Liste",
          "Entziehbar: Mit /rsu command durch VIPs/Admins",
          "Private Räume: Können in eigenen privaten Räumen SUPERUSER vergeben"
        ]
      },
      {
        icon: <User className="w-5 h-5 text-green-400" />,
        title: "👤 STANDARD USER",
        color: "text-green-400",
        permissions: [
          "Basis-Chat: Nachrichten schreiben und lesen",
          "Private Nachrichten: Whisper und PM-Funktionen",
          "User-Info: Kann User-Profile anzeigen (/w, /wc)",
          "Navigation: Zwischen öffentlichen Räumen wechseln"
        ]
      }
    ],
    commands: {
      basic: [
        { cmd: "/help", desc: "Diese Hilfeseite anzeigen" },
        { cmd: "/w <user>", desc: "Detaillierte User-Info anzeigen" },
        { cmd: "/who", desc: "Alle User im aktuellen Raum auflisten" },
        { cmd: "/users", desc: "Alle User in allen Räumen anzeigen" },
        { cmd: "/whisper <user> <msg>", desc: "Private Nachricht senden (nur im Raum)" },
        { cmd: "/pm <user> <msg>", desc: "Private Nachricht senden (systemweit)" },
        { cmd: "/a <msg>", desc: "Away-Status setzen mit Nachricht" },
        { cmd: "/f+ <user>", desc: "Freundschaftsanfrage senden" },
        { cmd: "/col #hex", desc: "Textfarbe ändern (z.B. /col #ff0000 für rot)" }
      ],
      moderation: [
        { cmd: "/k <user>", desc: "User ins Exil werfen" },
        { cmd: "/gag <user> [min]", desc: "User temporär stumm schalten (Standard: 5min)" },
        { cmd: "/t <thema>", desc: "Raumthema setzen (auch temp. SUPERUSER)" },
        { cmd: "/sepa <raumname>", desc: "Privaten Raum erstellen (Ersteller bekommt temp. SUPERUSER)" }
      ],
      vip: [
        { cmd: "/nick <name>", desc: "Nickname temporär ändern" },
        { cmd: "/i <user>", desc: "User in aktuellen Raum einladen" },
        { cmd: "/su <user>", desc: "Temporäre SUPERUSER-Rechte verleihen" },
        { cmd: "/rsu <user>", desc: "Temporäre SUPERUSER-Rechte entziehen" },
        { cmd: "/kh <user> <min>", desc: "User temporär aus Chat bannen (nur VIP/Admin)" }
      ]
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className={`bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 text-yellow-400 ${className}`}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Hilfe & Befehle
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-slate-900 border-cyan-500/30">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
            🖥️ RichComm NetCommunity - Hilfe & Informationen
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Rollen-System */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-cyan-500/20">
            <h3 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
              🏛️ RICHCOMM ROLLEN-SYSTEM
            </h3>
            
            <div className="space-y-4">
              {helpContent.roles.map((role, index) => (
                <div key={index} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
                  <div className="flex items-center gap-2 mb-3">
                    {role.icon}
                    <h4 className={`font-bold ${role.color}`}>{role.title}</h4>
                  </div>
                  <ul className="space-y-1 text-sm text-gray-300 ml-6">
                    {role.permissions.map((permission, pIndex) => (
                      <li key={pIndex} className="flex items-start gap-2">
                        <span className="text-gray-500">•</span>
                        <span>{permission}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Chat-Befehle */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-cyan-500/20">
            <h3 className="text-xl font-bold text-cyan-400 mb-4">
              💬 CHAT-BEFEHLE
            </h3>
            
            {/* Basis-Befehle */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-green-400 mb-3">
                👤 BASIS-BEFEHLE (Alle User)
              </h4>
              <div className="grid md:grid-cols-2 gap-2">
                {helpContent.commands.basic.map((command, index) => (
                  <div key={index} className="bg-slate-700/30 rounded p-3 border border-slate-600/30">
                    <span className="font-mono text-yellow-400 text-sm">{command.cmd}</span>
                    <p className="text-gray-300 text-xs mt-1">{command.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Moderations-Befehle */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-orange-400 mb-3">
                🛡️ MODERATIONS-BEFEHLE (VIP, Admin, temp. SUPERUSER)
              </h4>
              <div className="grid md:grid-cols-2 gap-2">
                {helpContent.commands.moderation.map((command, index) => (
                  <div key={index} className="bg-slate-700/30 rounded p-3 border border-slate-600/30">
                    <span className="font-mono text-yellow-400 text-sm">{command.cmd}</span>
                    <p className="text-gray-300 text-xs mt-1">{command.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* VIP/SUPERUSER Befehle */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-purple-400 mb-3">
                ⭐ VIP/SUPERUSER-BEFEHLE (Nur VIP & Admin)
              </h4>
              <div className="grid md:grid-cols-2 gap-2">
                {helpContent.commands.vip.map((command, index) => (
                  <div key={index} className="bg-slate-700/30 rounded p-3 border border-slate-600/30">
                    <span className="font-mono text-yellow-400 text-sm">{command.cmd}</span>
                    <p className="text-gray-300 text-xs mt-1">{command.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Punkte-System */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-cyan-500/20">
            <h3 className="text-xl font-bold text-cyan-400 mb-4">
              🏆 PUNKTE-SYSTEM
            </h3>
            <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
              <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-300">
                <div>
                  <h5 className="font-semibold text-yellow-400 mb-2">Punkte sammeln:</h5>
                  <ul className="space-y-1">
                    <li>• Chat-Teilnahme: +1 Punkt pro Nachricht</li>
                    <li>• Forum-Posts: +5 Punkte pro Beitrag</li>
                    <li>• Gästebuch-Einträge: +2 Punkte</li>
                    <li>• Community-Aktivität: Bonus-Punkte</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-semibold text-yellow-400 mb-2">Verwendung:</h5>
                  <ul className="space-y-1">
                    <li>• Leaderboard-Ranking</li>
                    <li>• Special Features freischalten</li>
                    <li>• Community-Status erhöhen</li>
                    <li>• Belohnungen erhalten</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Zusätzliche Informationen */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-cyan-500/20">
            <h3 className="text-xl font-bold text-cyan-400 mb-4">
              ℹ️ ZUSÄTZLICHE INFORMATIONEN
            </h3>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="bg-slate-700/30 rounded p-3 border border-slate-600/30">
                <h5 className="font-semibold text-yellow-400 mb-2">Gästebuch-System:</h5>
                <p>• 🔒 Private Einträge nur für Besitzer und Autor sichtbar</p>
                <p>• Öffentliche Einträge für alle Community-Mitglieder sichtbar</p>
                <p>• Maximale Länge: 500 Zeichen pro Eintrag</p>
              </div>
              <div className="bg-slate-700/30 rounded p-3 border border-slate-600/30">
                <h5 className="font-semibold text-yellow-400 mb-2">Forum-System:</h5>
                <p>• Hierarchische Struktur mit Themen und Antworten</p>
                <p>• Moderation durch Forum-Moderatoren und höhere Ränge</p>
                <p>• Punkte-System für aktive Teilnahme</p>
              </div>
              <div className="bg-slate-700/30 rounded p-3 border border-slate-600/30">
                <h5 className="font-semibold text-yellow-400 mb-2">Chat-Features:</h5>
                <p>• (c) neben Namen = Moderation-berechtigt (VIP, Admin, Moderator)</p>
                <p>• ⚡ neben Namen = Temporäre SUPERUSER-Rechte</p>
                <p>• Private Räume für besondere Diskussionen</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HelpPopup;