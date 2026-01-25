import React, { useState, useRef, useEffect } from 'react';
import {
 Users, Shield, Calendar, UserPlus, Edit, MessageCircle, Bell,
  MoreVertical, Search, Share2, Crown, User,
  ChevronLeft
} from 'lucide-react';
import { useParams } from "react-router-dom";
import axios from "../lib/axios";

const mockSettings = { darkMode: true }; // ← replace with real settings context later

const GroupProfilePage = () => {
  const { groupId } = useParams();

  const [group, setGroup]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrollY, setScrollY]     = useState(0);

  const scrollRef = useRef(null);
  const rafRef    = useRef(null);
  const lastY     = useRef(0);

  const settings  = mockSettings;   // ← should come from theme context
  const isCreator = true;           // ← should come from auth + group data
  const isAdmin   = true;           // ← should come from auth + group data

  // Fetch group
  useEffect(() => {
    if (!groupId) return;

    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`/groups/${groupId}`);
        if (mounted) setGroup(data);
      } catch (err) {
        console.error("Group fetch failed", err);
        if (mounted) setGroup(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [groupId]);

  // Smooth scroll tracking
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const y = el.scrollTop;
        if (Math.abs(y - lastY.current) > 1) {
          setScrollY(y);
          lastY.current = y;
        }
      });
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const isScrolled   = scrollY > 60;
  const coverHeight  = isScrolled ? 64 : 140;
  const avatarSize   = isScrolled ? 48 : 112;

  const filteredMembers = group.members.filter(m =>
    m.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading group...
      </div>
    );
  }

  const handleBack = () => {
    navigator(-1);
    };
  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-400">
        Group not found
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${settings.darkMode ? 'bg-zinc-950' : 'bg-gray-50'}`}>

      {/* ── Sticky Header ── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? settings.darkMode
            ? 'bg-zinc-900/90 backdrop-blur-xl border-b border-zinc-800/60 shadow-lg'
            : 'bg-white/90 backdrop-blur-xl border-b border-gray-200/60 shadow-lg'
          : 'bg-transparent'
      }`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button className={`p-2 rounded-full ${settings.darkMode ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-gray-100 text-gray-700'}`} 
                onClick={() => handleBack()}
            >
                <ChevronLeft size={22} />
              </button>
              <div className={`flex items-center gap-3 transition-all duration-300 ${isScrolled ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'}`}>
                {group.avatar ? (
                  <img src={group.avatar} alt="" className="w-9 h-9 rounded-full object-cover ring-1 ring-white/20" />
                ) : (
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${settings.darkMode ? 'bg-linear-to-br from-blue-600 to-purple-700' : 'bg-linear-to-br from-blue-500 to-purple-600'}`}>
                    <Users size={18} className="text-white" />
                  </div>
                )}
                <h1 className={`font-semibold text-lg truncate ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {group.name}
                </h1>
              </div>
            </div>

            <div className="flex gap-1">
              <button className={`p-2.5 rounded-xl ${settings.darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}`}><Search size={20} /></button>
              <button className={`p-2.5 rounded-xl ${settings.darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}`}><Bell  size={20} /></button>
              <button className={`p-2.5 rounded-xl ${settings.darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}`}><MoreVertical size={20} /></button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Scroll container ── */}
      <div ref={scrollRef} className="h-screen overflow-y-auto pt-16">
        <div className="max-w-5xl mx-auto">

          {/* Cover + overlapping avatar */}
          <div className="relative">
            <div
              className={`transition-all duration-500 ease-out ${
                settings.darkMode ? 'bg-linear-to-br from-blue-700 via-indigo-700 to-purple-800' : 'bg-linear-to-br from-blue-500 via-indigo-500 to-purple-600'
              }`}
              style={{ height: `${coverHeight}px` }}
            >
              <div className="absolute inset-0 bg-black/25" />
            </div>

            <div
              className="absolute left-6 transition-all duration-500 ease-out"
              style={{
                top: isScrolled ? '10px' : '80px',
                transform: `translateY(${isScrolled ? '0' : '-50%'})`,
                width: `${avatarSize}px`,
                height: `${avatarSize}px`,
              }}
            >
              <div className={`w-full h-full rounded-full shadow-2xl overflow-hidden ring-4 transition-all duration-500 ${
                settings.darkMode ? 'ring-zinc-950' : 'ring-gray-50'
              }`}>
                {group.avatar ? (
                  <img src={group.avatar} alt={group.name} className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${
                    settings.darkMode ? 'bg-linear-to-br from-blue-600 to-purple-700' : 'bg-linear-to-br from-blue-500 to-purple-600'
                  }`}>
                    <Users size={isScrolled ? 28 : 56} className="text-white" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="px-5 sm:px-8 pt-10 pb-12">

            {/* Title + description (visible when not scrolled) */}
            <div className={`text-center transition-all duration-500 mb-8 ${isScrolled ? 'opacity-0 h-0 -mb-4' : 'opacity-100'}`}>
              <h1 className={`text-3xl sm:text-4xl font-bold mb-3 ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                {group.name}
              </h1>
              {group.description && (
                <p className={`max-w-2xl mx-auto leading-relaxed ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {group.description}
                </p>
              )}
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-4 mb-8 text-center">
              <div>
                <div className={`text-2xl font-bold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {group.members?.length ?? 0}
                </div>
                <div className={`text-xs uppercase tracking-wider mt-1 ${settings.darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Members
                </div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {group.stats?.messages ?? '—'}
                </div>
                <div className={`text-xs uppercase tracking-wider mt-1 ${settings.darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Messages
                </div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {group.createdAt ? new Date(group.createdAt).toLocaleDateString('en', { month: 'short', year: 'numeric' }) : '—'}
                </div>
                <div className={`text-xs uppercase tracking-wider mt-1 ${settings.darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Created
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 justify-center sm:justify-start mb-10">
              <button className={`flex-1 sm:flex-none min-w-35 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md transition hover:scale-105 active:scale-98 ${
                settings.darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}>
                <MessageCircle size={18} /> Message
              </button>
              <button className={`flex-1 sm:flex-none min-w-35 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md transition hover:scale-105 active:scale-98 ${
                settings.darkMode ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-gray-200 hover:bg-gray-300'
              }`}>
                <UserPlus size={18} /> Add Members
              </button>
              {(isCreator || isAdmin) && (
                <button className={`flex-1 sm:flex-none min-w-35 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md transition hover:scale-105 active:scale-98 ${
                  settings.darkMode ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-gray-200 hover:bg-gray-300'
                }`}>
                  <Edit size={18} /> Edit
                </button>
              )}
            </div>

            {/* Creator + Admins + Members sections */}
            <div className="grid lg:grid-cols-3 gap-6">

              {/* Left column */}
              <div className="lg:col-span-1 space-y-6">

                {/* Creator */}
                <div className={`rounded-2xl p-5 shadow-sm ${
                  settings.darkMode ? 'bg-zinc-900/70 border border-zinc-800/60' : 'bg-white border border-gray-200'
                }`}>
                  <h3 className={`font-semibold mb-4 ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Group Creator
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className={`w-14 h-14 rounded-full ring-4 overflow-hidden ${
                        settings.darkMode ? 'ring-amber-900/40 bg-amber-900/30' : 'ring-amber-200 bg-amber-100'
                      }`}>
                        {group.creator?.profilePicture ? (
                          <img src={group.creator.profilePicture} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User size={28} className={settings.darkMode ? 'text-amber-300' : 'text-amber-600'} />
                          </div>
                        )}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                        settings.darkMode ? 'bg-amber-500 border-zinc-950' : 'bg-amber-500 border-white'
                      }`}>
                        <Crown size={12} className="text-white" />
                      </div>
                    </div>
                    <div>
                      <div className={`font-medium ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {group.creator?.name}
                      </div>
                      <div className={`text-sm ${settings.darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                        {group.creator?.role || 'Creator'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Admins */}
                {group.admins?.length > 0 && (
                  <div className={`rounded-2xl p-5 shadow-sm ${
                    settings.darkMode ? 'bg-zinc-900/70 border border-zinc-800/60' : 'bg-white border border-gray-200'
                  }`}>
                    <h3 className={`font-semibold mb-4 ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Admins ({group.admins.length})
                    </h3>
                    <div className="space-y-3">
                      {group.admins.map(admin => (
                        <div key={admin._id} className="flex items-center gap-3">
                          <div className="relative">
                            <div className={`w-10 h-10 rounded-full overflow-hidden ring-2 ${
                              settings.darkMode ? 'ring-zinc-800 bg-zinc-800' : 'ring-gray-200 bg-gray-200'
                            }`}>
                              {admin.profilePicture ? (
                                <img src={admin.profilePicture} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <User size={18} className={settings.darkMode ? 'text-gray-400' : 'text-gray-500'} />
                                </div>
                              )}
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              settings.darkMode ? 'bg-green-500 border-zinc-950' : 'bg-green-500 border-white'
                            }`}>
                              <Shield size={10} className="text-white" />
                            </div>
                          </div>
                          <div>
                            <div className={`text-sm font-medium ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {admin.name}
                            </div>
                            <div className={`text-xs ${settings.darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {admin.role || 'Admin'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Members */}
              <div className="lg:col-span-2">
                <div className={`rounded-2xl overflow-hidden shadow-sm ${
                  settings.darkMode ? 'bg-zinc-900/70 border border-zinc-800/60' : 'bg-white border border-gray-200'
                }`}>
                  <div className={`p-5 border-b ${settings.darkMode ? 'border-zinc-800' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`font-semibold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Members ({group.members?.length || 0})
                      </h3>
                    </div>
                    <div className="relative">
                      <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${settings.darkMode ? 'text-gray-500' : 'text-gray-400'}`} size={18} />
                      <input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search members..."
                        className={`w-full pl-11 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition ${
                          settings.darkMode
                            ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500'
                            : 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-500'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="p-5 max-h-96 overflow-y-auto">
                    <div className="grid sm:grid-cols-2 gap-3">
                      {filteredMembers.map(member => {
                        const isC = group.creator?._id === member._id;
                        const isA = group.admins?.some(a => a._id === member._id);

                        return (
                          <div
                            key={member._id}
                            className={`p-3 rounded-xl border transition hover:scale-[1.01] ${
                              settings.darkMode
                                ? 'bg-zinc-800/50 border-zinc-700/60 hover:border-zinc-600'
                                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className={`w-11 h-11 rounded-full overflow-hidden ${
                                  settings.darkMode ? 'bg-zinc-800' : 'bg-gray-200'
                                }`}>
                                  {member.profilePicture ? (
                                    <img src={member.profilePicture} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <User size={20} className={settings.darkMode ? 'text-gray-400' : 'text-gray-500'} />
                                    </div>
                                  )}
                                </div>
                                {isC && (
                                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    settings.darkMode ? 'bg-amber-500 border-zinc-900' : 'bg-amber-500 border-white'
                                  }`}>
                                    <Crown size={10} className="text-white" />
                                  </div>
                                )}
                                {isA && !isC && (
                                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    settings.darkMode ? 'bg-green-500 border-zinc-900' : 'bg-green-500 border-white'
                                  }`}>
                                    <Shield size={10} className="text-white" />
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className={`font-medium truncate ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {member.name}
                                </div>
                                {member.role && (
                                  <div className={`text-xs truncate ${settings.darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {member.role}
                                  </div>
                                )}
                                <div className="flex gap-1.5 mt-1 flex-wrap">
                                  {isC && <span className={`text-[10px] px-2 py-0.5 rounded-full ${settings.darkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>Creator</span>}
                                  {isA && !isC && <span className={`text-[10px] px-2 py-0.5 rounded-full ${settings.darkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'}`}>Admin</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupProfilePage;