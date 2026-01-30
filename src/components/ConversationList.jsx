import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Pin,
  Archive,
  Star,
  BellOff,
  Trash2,
  Eraser,
  MoreVertical,
  RefreshCw,
  Lock,
  Search,
  ShieldCheck,
  MessageSquare,
  Unlock,
  ChevronLeft
} from "lucide-react";

export default function ConversationList({
  conversations: incomingConversations,
  loadingConversations,
  selectedConversation,
  activeFilter,
  setActiveFilter,
  fetchConversations,
  fetchConversationMessages,
  userId,
  userPresence,
  setUserPresence,
  typingUsers,
}) {
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [lockModal, setLockModal] = useState({
    open: false,
    type: "",
    targetId: null,
    currentValue: null,
  });
  const [password, setPassword] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const token = localStorage.getItem("jwtToken");

  // --- Process Conversations ---
  const conversations = useMemo(() => {
    if (Array.isArray(incomingConversations)) return incomingConversations;
    return incomingConversations?.conversations || [];
  }, [incomingConversations]);

  // --- WhatsApp Magic: Detect Secret View ---
  useEffect(() => {
    // If backend returns data indicating we've entered the vault via secret code
    if (incomingConversations?.filterType === "lockedChats" || incomingConversations?.isLockedView) {
      if (activeFilter !== "lockedChats") {
        setActiveFilter("lockedChats");
        setSearchTerm(""); // 🪄 Instantly hide the secret code from the input
      }
    }
  }, [incomingConversations, activeFilter, setActiveFilter]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    // Backend will check if 'value' matches the hashed password
    fetchConversations(activeFilter, value);
  };

  const handleExitLockedFolder = () => {
    setActiveFilter("inbox");
    setSearchTerm("");
    fetchConversations("inbox", "");
  };

  const handlePreferenceToggle = async (e, conv, field) => {
    e.stopPropagation();
    const currentValue = conv[field];

    if (field === "isLocked") {
      try {
        const res = await axios.get("http://localhost:4002/chat/lock/status", {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });

        if (!res.data.hasPassword) {
          // Trigger Setup modal for first-time users
          setLockModal({ open: true, type: "set", targetId: conv.conversationId, currentValue: true });
        } else {
          // Trigger Identity Verification for existing users
          setLockModal({
            open: true,
            type: "toggle_verify",
            targetId: conv.conversationId,
            currentValue: !currentValue,
          });
        }
      } catch (err) {
        console.error("Lock status check failed", err);
      }
      setMenuOpenId(null);
      return;
    }

    // Standard Toggles (Pin, Archive, Star, Mute)
    const mapping = { isPinned: "pin", isArchived: "archive", isMuted: "mute", isStarred: "star" };
    try {
      await axios.patch(`http://localhost:4002/chat/conversations/${conv.conversationId}/${mapping[field]}`,
        { value: !currentValue },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
      setMenuOpenId(null);
      fetchConversations(activeFilter, searchTerm);
    } catch (err) {
      console.error("Toggle error:", err);
    }
  };

  const handleLockSubmit = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` }, withCredentials: true };
      
      if (lockModal.type === "set") {
        // Set new password then lock
        await axios.post("http://localhost:4002/chat/lock/set-password", { password }, config);
        await executeLockToggle(lockModal.targetId, true);
      } else if (lockModal.type === "toggle_verify") {
        // Verify then toggle (lock or unlock)
        const res = await axios.post("http://localhost:4002/chat/lock/verify", { password }, config);
        if (res.data.success) {
          await executeLockToggle(lockModal.targetId, lockModal.currentValue);
        }
      }
      setLockModal({ open: false, type: "", targetId: null, currentValue: null });
      setPassword("");
    } catch (err) {
      alert(err.response?.data?.error || "Security verification failed");
    }
  };

  const executeLockToggle = async (id, val) => {
    await axios.patch(`http://localhost:4002/chat/conversations/${id}/lock`, 
      { value: val }, 
      { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
    );
    fetchConversations(activeFilter, searchTerm);
  };

  // --- UI Helpers ---
  const formatImageUrl = (url) => {
    if (!url) return null;
    return url.startsWith("http") ? url : `https://${url}`;
  };

  const formatTime = (t) => t ? new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <div className="flex flex-col h-screen bg-white border-r border-slate-200 min-w-[380px] relative font-sans">
      
      {/* Header */}
      <div className="p-6 pb-2 space-y-4">
        <div className="flex justify-between items-center">
          {activeFilter === "lockedChats" ? (
            <button onClick={handleExitLockedFolder} className="flex items-center gap-2 text-indigo-600 font-black text-xl hover:opacity-70 transition-all">
              <ChevronLeft size={24} /> Locked Chats
            </button>
          ) : (
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <MessageSquare className="text-indigo-600" /> Chats
            </h1>
          )}
          <button onClick={() => fetchConversations(activeFilter, searchTerm)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-all">
            <RefreshCw size={20} className={loadingConversations ? "animate-spin" : ""} />
          </button>
        </div>

        {/* The "Secret" Search Bar */}
        <div className="relative group">
          <Search className="absolute left-3 top-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search or enter secret code..." 
            className="w-full bg-slate-100 border-2 border-transparent focus:border-indigo-100 focus:bg-white rounded-2xl py-2.5 pl-10 pr-4 text-sm transition-all outline-none"
            value={searchTerm} 
            onChange={handleSearchChange} 
          />
        </div>

        {/* Visible Filter Tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
          {[{ id: "inbox", label: "All" }, { id: "favorites", label: "Favs" }, { id: "archived", label: "Archived" }].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveFilter(tab.id); fetchConversations(tab.id, searchTerm); }}
              className={`flex-1 py-2 text-[11px] font-black rounded-xl transition-all ${activeFilter === tab.id ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 custom-scrollbar">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
            <Lock size={48} strokeWidth={1} />
            <p className="mt-2 text-sm font-medium">No conversations found</p>
          </div>
        ) : (
          conversations.map((conv) => {
            const user = conv.otherUser || {};
            const isSelected = selectedConversation === user.userId;

            return (
              <div
                key={conv.conversationId}
                onClick={() => fetchConversationMessages(user.userId)}
                className={`group flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${isSelected ? "bg-indigo-50 shadow-sm ring-1 ring-indigo-100" : "hover:bg-slate-50"}`}
              >
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-200 flex-shrink-0">
                  <img src={formatImageUrl(user.profilePicUrl) || `https://ui-avatars.com/api/?name=${user.firstName}`} alt="" className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 truncate flex items-center gap-1.5 text-sm">
                      {user.firstName} {user.lastName}
                      <div className="flex gap-1">
                        {conv.isPinned && <Pin size={12} className="text-indigo-500 fill-indigo-500" />}
                        {conv.isStarred && <Star size={12} className="text-amber-400 fill-amber-400" />}
                        {conv.isLocked && <Lock size={12} className="text-indigo-400" />}
                      </div>
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{formatTime(conv.lastActivityAt)}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{conv.lastMessage?.content || "Tap to chat"}</p>
                </div>

                <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === conv.conversationId ? null : conv.conversationId); }} className="p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical size={16} className="text-slate-400" />
                </button>

                {menuOpenId === conv.conversationId && (
                  <div className="absolute right-10 mt-20 w-48 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden py-2 animate-in fade-in zoom-in-95 duration-100">
                     <MenuBtn onClick={(e) => handlePreferenceToggle(e, conv, 'isPinned')} icon={<Pin size={14}/>} label={conv.isPinned ? "Unpin Chat" : "Pin Chat"} />
                     <MenuBtn onClick={(e) => handlePreferenceToggle(e, conv, 'isStarred')} icon={<Star size={14}/>} label={conv.isStarred ? "Unstar" : "Star"} />
                     <MenuBtn onClick={(e) => handlePreferenceToggle(e, conv, 'isArchived')} icon={<Archive size={14}/>} label={conv.isArchived ? "Unarchive" : "Archive"} />
                     <MenuBtn onClick={(e) => handlePreferenceToggle(e, conv, 'isLocked')} icon={conv.isLocked ? <Unlock size={14} /> : <Lock size={14} />} label={conv.isLocked ? "Unlock Chat" : "Lock Chat"} color="text-indigo-600" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Security Modal */}
      {lockModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center space-y-6 animate-in slide-in-from-bottom-8 duration-300">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck size={40} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">{lockModal.type === "set" ? "Security Setup" : "Verify Identity"}</h3>
              <p className="text-sm text-slate-500 mt-2">{lockModal.type === "set" ? "Choose a password to hide your private conversations." : "Enter your secret code to confirm this change."}</p>
            </div>
            <input 
              autoFocus 
              type="password" 
              placeholder="••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleLockSubmit()}
              className="w-full bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 focus:bg-white rounded-2xl py-4 px-4 text-center text-2xl tracking-[0.5em] outline-none transition-all" 
            />
            <div className="flex gap-3">
              <button onClick={() => setLockModal({ open: false })} className="flex-1 py-4 text-sm font-bold text-slate-400">Cancel</button>
              <button onClick={handleLockSubmit} className="flex-1 py-4 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-lg">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuBtn({ onClick, icon, label, color = "text-slate-600" }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors ${color}`}>
      {icon} {label}
    </button>
  );
}