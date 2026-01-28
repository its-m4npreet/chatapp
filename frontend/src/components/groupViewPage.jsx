import React, { useState, useRef, useEffect } from "react";
import {
  Users,
  Shield,
  Calendar,
  UserPlus,
  Edit,
  MessageCircle,
  Bell,
  MoreVertical,
  Search,
  Share2,
  Crown,
  User,
  ChevronLeft,
  LogOut,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../lib/axios";
import NotificationPopup from "./NotificationPopup";
import EditGroupModal from "./EditGroupModal";
import InviteToGroupModal from "./InviteToGroupModal";

const mockSettings = { darkMode: true }; // ← replace with real settings context later

const GroupProfilePage = ({ currentUser }) => {
  const { groupId } = useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrollY, setScrollY] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [messageResults, setMessageResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [showAllMembers, setShowAllMembers] = useState(false);

  const scrollRef = useRef(null);
  const searchInputRef = useRef(null);
  const rafRef = useRef(null);
  const lastY = useRef(0);
  const dropdownRef = useRef(null);

  // Note: These are mocks. In a real app, they'd come from context/auth.
  const settings = mockSettings;
  const isCreator = group?.creator?._id === currentUser?._id;
  const isAdmin = group?.admins?.some((a) => a._id === currentUser?._id);

  // Fetch group data
  useEffect(() => {
    if (!groupId) return;

    let mounted = true;
    const fetchGroup = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`/groups/${groupId}`);
        if (mounted) setGroup(data.group);
      } catch (err) {
        console.error("Group fetch failed", err);
        if (mounted) setGroup(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchGroup();

    return () => {
      mounted = false;
    };
  }, [groupId]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setMessageResults([]);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await axios.get(
          `/groups/${groupId}/messages?search=${searchQuery}`,
          { signal },
        );
        setMessageResults(data.messages);
      } catch (error) {
        if (error.name !== "CanceledError") {
          console.error("Failed to search messages", error);
        }
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => {
      clearTimeout(delayDebounceFn);
      controller.abort();
    };
  }, [searchQuery, groupId]);

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

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const handleLeaveGroup = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) {
      return;
    }
    try {
      await axios.post(`/groups/${group._id}/leave`);
      navigate("/"); // Go back to home
    } catch (err) {
      console.error("Failed to leave group", err);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleSearchClick = () => {
    searchInputRef.current?.focus();
  };

  const handleGroupUpdated = (updatedGroup) => {
    // If the full group object is passed, update the state
    if (updatedGroup) {
      setGroup(updatedGroup);
    } else {
      // If not, refetch the group data
      axios.get(`/groups/${groupId}`).then((res) => setGroup(res.data.group));
    }
  };

  const handleMessageClick = () => {
    navigate("/", { state: { openGroupId: group._id } });
  };

  const isScrolled = scrollY > 60;
  const coverHeight = isScrolled ? 64 : 200;
  const avatarSize = 112;

  const avatarStyle = {
    width: `${avatarSize}px`,
    height: `${avatarSize}px`,
    top: "200px",
    left: "50%",
    transform: "translateY(-50%) translateX(-50%)",
  };

  const filteredMembers = group?.members ?? [];

  const membersToShow = showAllMembers
    ? filteredMembers
    : filteredMembers.slice(0, 6);

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading group...
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-400">
        Group not found or you don't have access.
      </div>
    );
  }

  return (
    <>
      <div
        className={`min-h-screen ${settings.darkMode ? "bg-zinc-950" : "bg-gray-50"}`}
      >
        {/* ── Sticky Header ── */}
        <header
          className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
            settings.darkMode
              ? "bg-zinc-900 backdrop-blur-xl border-b border-zinc-800/60 shadow-lg"
              : "bg-white backdrop-blur-xl border-b border-gray-200/60 shadow-lg"
          }`}
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-2">
                <button
                  className={`p-2 rounded-full ${settings.darkMode ? "hover:bg-zinc-800 text-zinc-300" : "hover:bg-gray-100 text-gray-700"}`}
                  onClick={handleBack}
                >
                  <ChevronLeft size={22} />
                </button>
                <div
                  className={`flex items-center gap-2 transition-opacity duration-300 ${isScrolled ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                >
                  <div
                    className={`w-12 h-12 rounded-full overflow-hidden shrink-0 ${settings.darkMode ? "bg-zinc-800" : "bg-gray-200"}`}
                  >
                    {group.avatar ? (
                      <img
                        src={group.avatar}
                        alt={group.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className={`w-full h-full flex items-center justify-center ${settings.darkMode ? "bg-linear-to-br from-blue-600 to-purple-700" : "bg-linear-to-br from-blue-500 to-purple-600"}`}
                      >
                        <Users size={28} className="text-white" />
                      </div>
                    )}
                  </div>

                  <h1
                    className={`font-semibold text-lg truncate ${settings.darkMode ? "text-white" : "text-gray-900"}`}
                  >
                    {group.name}
                  </h1>
                </div>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={handleSearchClick}
                  className={`p-2.5 rounded-xl ${settings.darkMode ? "hover:bg-zinc-800" : "hover:bg-gray-100"}`}
                >
                  <Search size={20} />
                </button>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdown((prev) => !prev)}
                    className={`p-2.5 rounded-xl ${
                      settings.darkMode
                        ? "hover:bg-zinc-800"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <MoreVertical size={20} />
                  </button>
                  {showDropdown && (
                    <div
                      className={`absolute top-14 right-5 w-56 rounded-xl shadow-lg z-50 p-2 ${
                        settings.darkMode
                          ? "bg-zinc-800 border border-zinc-700"
                          : "bg-white border border-gray-200"
                      }`}
                    >
                      <button
                        onClick={() => {
                          setShowInviteModal(true);
                          setShowDropdown(false);
                        }}
                        className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          settings.darkMode
                            ? "hover:bg-zinc-700 text-zinc-200"
                            : "hover:bg-gray-100 text-gray-800"
                        }`}
                      >
                        <UserPlus size={16} />
                        <span>Add Members</span>
                      </button>
                      {(isCreator || isAdmin) && (
                        <button
                          onClick={() => {
                            setShowEditGroupModal(true);
                            setShowDropdown(false);
                          }}
                          className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                            settings.darkMode
                              ? "hover:bg-zinc-700 text-zinc-200"
                              : "hover:bg-gray-100 text-gray-800"
                          }`}
                        >
                          <Edit size={16} />
                          <span>Edit Group</span>
                        </button>
                      )}
                      <div
                        className={`my-1 h-0.5 ${
                          settings.darkMode ? "bg-zinc-700" : "bg-gray-200"
                        }`}
                      />
                      <button
                        onClick={handleLeaveGroup}
                        className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          settings.darkMode
                            ? "text-red-400 hover:bg-red-500/10"
                            : "text-red-600 hover:bg-red-50"
                        }`}
                      >
                        <LogOut size={16} />
                        <span>Leave Group</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── Scroll container ── */}
        <div ref={scrollRef} className="h-screen overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            {/* Cover + overlapping avatar */}
            <div className="relative">
              <div
                className={`transition-all duration-500 ease-out ${
                  settings.darkMode
                    ? "bg-linear-to-br from-blue-700 via-indigo-700 to-purple-800"
                    : "bg-linear-to-br from-blue-500 via-indigo-500 to-purple-600"
                }`}
                style={{ height: `${coverHeight}px` }}
              >
                <div className="absolute inset-0 bg-black/25" />
              </div>

              <div
                className={`absolute transition-all duration-500 ease-out z-10 ${isScrolled ? "opacity-0 pointer-events-none" : "opacity-100"}`}
                style={avatarStyle}
              >
                <div
                  className={`w-full h-full rounded-full shadow-2xl overflow-hidden ring-4 transition-all duration-500 ${
                    settings.darkMode ? "ring-zinc-950" : "ring-gray-50"
                  }`}
                >
                  {group.avatar ? (
                    <img
                      src={group.avatar}
                      alt={group.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className={`w-full h-full flex items-center justify-center ${
                        settings.darkMode
                          ? "bg-linear-to-br from-blue-600 to-purple-700"
                          : "bg-linear-to-br from-blue-500 to-purple-600"
                      }`}
                    >
                      <Users size={56} className="text-white" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="px-4 sm:px-6 lg:px-8 pt-24 pb-12">
              {/* Title + description (visible when not scrolled) */}
              <div
                className={`text-center transition-all duration-500 mb-8 ${isScrolled ? "opacity-0 h-0 -mb-4" : "opacity-100"}`}
              >
                <h1
                  className={`text-3xl sm:text-4xl font-bold mb-3 ${settings.darkMode ? "text-white" : "text-gray-900"}`}
                >
                  {group.name}
                </h1>
                {group.description && (
                  <p
                    className={`max-w-md mx-auto leading-relaxed ${settings.darkMode ? "text-gray-400" : "text-gray-600"}`}
                  >
                    {group.description}
                  </p>
                )}
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-4 mb-8 text-center">
                <div>
                  <div
                    className={`text-xl sm:text-2xl font-bold ${settings.darkMode ? "text-white" : "text-gray-900"}`}
                  >
                    {group.members?.length ?? 0}
                  </div>
                  <div
                    className={`text-xs uppercase tracking-wider mt-1 ${settings.darkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    Members
                  </div>
                </div>
                {/* <div>
                  <div
                    className={`text-xl sm:text-2xl font-bold ${settings.darkMode ? "text-white" : "text-gray-900"}`}
                  >
                    {group.stats?.messages ?? "—"}
                  </div>
                  <div
                    className={`text-xs uppercase tracking-wider mt-1 ${settings.darkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    Messages
                  </div>
                </div>*/}
                <div>
                  <div
                    className={`text-xl sm:text-2xl font-bold ${settings.darkMode ? "text-white" : "text-gray-900"}`}
                  >
                    {group.createdAt
                      ? new Date(group.createdAt).toLocaleDateString("en", {
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </div>
                  <div
                    className={`text-xs uppercase tracking-wider mt-1 ${settings.darkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    Created
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 justify-center sm:justify-start mb-10">
                <button
                  onClick={handleMessageClick}
                  className={`flex-1 sm:flex-none min-w-35 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md transition hover:scale-105 active:scale-98 ${
                    settings.darkMode
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  <MessageCircle size={18} /> Message
                </button>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className={`flex-1 sm:flex-none min-w-35 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md transition hover:scale-105 active:scale-98 ${
                    settings.darkMode
                      ? "bg-zinc-800 hover:bg-zinc-700"
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
                >
                  <UserPlus size={18} /> Add Members
                </button>
                {(isCreator || isAdmin) && (
                  <button
                    onClick={() => setShowEditGroupModal(true)}
                    className={`flex-1 sm:flex-none min-w-35 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md transition hover:scale-105 active:scale-98 ${
                      settings.darkMode
                        ? "bg-zinc-800 hover:bg-zinc-700"
                        : "bg-gray-200 hover:bg-gray-300"
                    }`}
                  >
                    <Edit size={18} /> Edit
                  </button>
                )}
              </div>

              {/* Creator + Admins + Members sections */}
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Left column */}
                <div className="lg:col-span-1 space-y-6">
                  {/* Creator */}
                  <div
                    className={`rounded-2xl p-5 shadow-sm ${
                      settings.darkMode
                        ? "bg-zinc-900/70 border border-zinc-800/60"
                        : "bg-white border border-gray-200"
                    }`}
                  >
                    <h3
                      className={`font-semibold mb-4 ${settings.darkMode ? "text-white" : "text-gray-900"}`}
                    >
                      Group Creator
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div
                          className={`w-14 h-14 rounded-full ring-4 overflow-hidden ${
                            settings.darkMode
                              ? "ring-amber-900/40 bg-amber-900/30"
                              : "ring-amber-200 bg-amber-100"
                          }`}
                        >
                          {group.creator?.profilePicture ? (
                            <img
                              src={group.creator.profilePicture}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User
                                size={28}
                                className={
                                  settings.darkMode
                                    ? "text-amber-300"
                                    : "text-amber-600"
                                }
                              />
                            </div>
                          )}
                        </div>
                        <div
                          className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                            settings.darkMode
                              ? "bg-amber-500 border-zinc-950"
                              : "bg-amber-500 border-white"
                          }`}
                        >
                          <Crown size={12} className="text-white" />
                        </div>
                      </div>
                      <div>
                        <div
                          className={`font-medium ${settings.darkMode ? "text-white" : "text-gray-900"}`}
                        >
                          {group.creator?.name}
                        </div>
                        <div
                          className={`text-sm ${settings.darkMode ? "text-amber-400" : "text-amber-600"}`}
                        >
                          {group.creator?.role || "Creator"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Admins */}
                  {group.admins?.length > 0 && (
                    <div
                      className={`rounded-2xl p-5 shadow-sm ${
                        settings.darkMode
                          ? "bg-zinc-900/70 border border-zinc-800/60"
                          : "bg-white border border-gray-200"
                      }`}
                    >
                      <h3
                        className={`font-semibold mb-4 ${settings.darkMode ? "text-white" : "text-gray-900"}`}
                      >
                        Admins ({group.admins.length})
                      </h3>
                      <div className="space-y-3">
                        {group.admins.map((admin) => (
                          <div
                            key={admin._id}
                            className="flex items-center gap-3"
                          >
                            <div className="relative">
                              <div
                                className={`w-10 h-10 rounded-full overflow-hidden ring-2 ${
                                  settings.darkMode
                                    ? "ring-zinc-800 bg-zinc-800"
                                    : "ring-gray-200 bg-gray-200"
                                }`}
                              >
                                {admin.profilePicture ? (
                                  <img
                                    src={admin.profilePicture}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <User
                                      size={18}
                                      className={
                                        settings.darkMode
                                          ? "text-gray-400"
                                          : "text-gray-500"
                                      }
                                    />
                                  </div>
                                )}
                              </div>
                              <div
                                className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                  settings.darkMode
                                    ? "bg-green-500 border-zinc-950"
                                    : "bg-green-500 border-white"
                                }`}
                              >
                                <Shield size={10} className="text-white" />
                              </div>
                            </div>
                            <div>
                              <div
                                className={`text-sm font-medium ${settings.darkMode ? "text-white" : "text-gray-900"}`}
                              >
                                {admin.name}
                              </div>
                              <div
                                className={`text-xs ${settings.darkMode ? "text-gray-400" : "text-gray-500"}`}
                              >
                                {admin.role || "Admin"}
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
                  <div
                    className={`rounded-2xl overflow-hidden shadow-sm ${
                      settings.darkMode
                        ? "bg-zinc-900/70 border border-zinc-800/60"
                        : "bg-white border border-gray-200"
                    }`}
                  >
                    <div
                      className={`p-5 border-b ${settings.darkMode ? "border-zinc-800" : "border-gray-200"}`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3
                          className={`font-semibold ${settings.darkMode ? "text-white" : "text-gray-900"}`}
                        >
                          Members ({group.members?.length || 0})
                        </h3>
                      </div>
                      <div className="relative">
                        <Search
                          className={`absolute left-4 top-1/2 -translate-y-1/2 ${settings.darkMode ? "text-gray-500" : "text-gray-400"}`}
                          size={18}
                        />
                        <input
                          ref={searchInputRef}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search messages..."
                          className={`w-full pl-11 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition ${
                            settings.darkMode
                              ? "bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500"
                              : "bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-500"
                          }`}
                        />
                      </div>
                    </div>

                    <div className="p-5 max-h-96 overflow-y-auto">
                      {isSearching && (
                        <div className="text-center py-4">
                          Searching messages...
                        </div>
                      )}
                      {messageResults.length > 0 && (
                        <div className="space-y-3 mb-5">
                          <h4 className="font-semibold text-sm">
                            Message Results
                          </h4>
                          {messageResults.map((msg) => (
                            <div
                              key={msg._id}
                              className={`p-2 rounded-lg ${settings.darkMode ? "bg-zinc-800" : "bg-gray-100"}`}
                            >
                              <div className="flex items-center gap-2">
                                <img
                                  src={msg.sender.profilePicture}
                                  className="w-6 h-6 rounded-full"
                                />
                                <span
                                  className={`text-sm font-medium ${settings.darkMode ? "text-white" : "text-gray-900"}`}
                                >
                                  {msg.sender.name}
                                </span>
                              </div>
                              <p
                                className={`text-sm mt-1 ${settings.darkMode ? "text-gray-300" : "text-gray-700"}`}
                              >
                                {msg.content}
                              </p>
                              <p
                                className={`text-xs text-right mt-1 ${settings.darkMode ? "text-gray-500" : "text-gray-400"}`}
                              >
                                {new Date(msg.createdAt).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                      {searchQuery &&
                        !isSearching &&
                        messageResults.length === 0 && (
                          <div className="text-center py-4">
                            No messages found.
                          </div>
                        )}
                      <div className="grid sm:grid-cols-2 gap-3">
                        {membersToShow.map((member) => {
                          const isC = group.creator?._id === member._id;
                          const isA = group.admins?.some(
                            (a) => a._id === member._id,
                          );

                          return (
                            <div
                              key={member._id}
                              className={`p-3 rounded-xl border transition hover:scale-[1.01] ${
                                settings.darkMode
                                  ? "bg-zinc-800/50 border-zinc-700/60 hover:border-zinc-600"
                                  : "bg-gray-50 border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <div
                                    className={`w-11 h-11 rounded-full overflow-hidden ${
                                      settings.darkMode
                                        ? "bg-zinc-800"
                                        : "bg-gray-200"
                                    }`}
                                  >
                                    {member.profilePicture ? (
                                      <img
                                        src={member.profilePicture}
                                        alt=""
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <User
                                          size={20}
                                          className={
                                            settings.darkMode
                                              ? "text-gray-400"
                                              : "text-gray-500"
                                          }
                                        />
                                      </div>
                                    )}
                                  </div>
                                  {isC && (
                                    <div
                                      className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                        settings.darkMode
                                          ? "bg-amber-500 border-zinc-900"
                                          : "bg-amber-500 border-white"
                                      }`}
                                    >
                                      <Crown size={10} className="text-white" />
                                    </div>
                                  )}
                                  {isA && !isC && (
                                    <div
                                      className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                        settings.darkMode
                                          ? "bg-green-500 border-zinc-900"
                                          : "bg-green-500 border-white"
                                      }`}
                                    >
                                      <Shield
                                        size={10}
                                        className="text-white"
                                      />
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div
                                    className={`font-medium truncate ${settings.darkMode ? "text-white" : "text-gray-900"}`}
                                  >
                                    {member.name}
                                  </div>
                                  {member.role && (
                                    <div
                                      className={`text-xs truncate ${settings.darkMode ? "text-gray-400" : "text-gray-500"}`}
                                    >
                                      {member.role}
                                    </div>
                                  )}
                                  <div className="flex gap-1.5 mt-1 flex-wrap">
                                    {isC && (
                                      <span
                                        className={`text-[10px] px-2 py-0.5 rounded-full ${settings.darkMode ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-700"}`}
                                      >
                                        Creator
                                      </span>
                                    )}
                                    {isA && !isC && (
                                      <span
                                        className={`text-[10px] px-2 py-0.5 rounded-full ${settings.darkMode ? "bg-green-500/20 text-green-300" : "bg-green-100 text-green-700"}`}
                                      >
                                        Admin
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {!showAllMembers && filteredMembers.length > 6 && (
                        <div className="mt-4">
                          <button
                            onClick={() => setShowAllMembers(true)}
                            className={`w-full py-2.5 rounded-xl font-semibold transition ${
                              settings.darkMode
                                ? "bg-zinc-800 hover:bg-zinc-700 text-white"
                                : "bg-gray-100 hover:bg-gray-200 text-gray-800"
                            }`}
                          >
                            Show All {filteredMembers.length} Members
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <NotificationPopup
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        // socket prop is optional in NotificationPopup
      />

      {group && (
        <EditGroupModal
          isOpen={showEditGroupModal}
          onClose={() => setShowEditGroupModal(false)}
          group={group}
          currentUser={currentUser}
          onGroupUpdated={handleGroupUpdated}
        />
      )}

      {group && (
        <InviteToGroupModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          group={group}
        />
      )}
    </>
  );
};

export default GroupProfilePage;
