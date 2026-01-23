import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, Search, MessageSquare, Users, Lock, Settings as SettingsIcon, HelpCircle, Rocket, User, Wrench, Lightbulb } from "lucide-react";

const HelpCenter = () => {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const helpCategories = useMemo(() => [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: Rocket,
      color: "text-orange-500",
      faqs: [
        {
          id: "gs-1",
          question: "How do I create an account?",
          answer: "Click on the Sign Up button on the login page. Enter your name, email, and password (minimum 8 characters with at least one number and special character). You'll receive an OTP on your email to verify your account. After verification, your account will be ready to use!"
        },
        {
          id: "gs-2",
          question: "How do I log in?",
          answer: "Use the Sign In page with your registered email and password. You can also use Google authentication for quick login. If you forget your password, click 'Forgot password' to reset it via email."
        },
        {
          id: "gs-3",
          question: "How do I verify my email?",
          answer: "During signup, you'll receive an OTP (One-Time Password) on your registered email. Enter this 6-digit code in the verification page. You can also verify your email anytime from Settings > Security > Verify Email."
        },
        {
          id: "gs-4",
          question: "Can I use Google to sign up?",
          answer: "Yes! Click 'Sign Up with Google' on the signup page. This automatically creates your account and logs you in. No need to remember another password!"
        }
      ]
    },
    {
      id: "messaging",
      title: "Messaging & Chats",
      icon: MessageSquare,
      color: "text-green-500",
      faqs: [
        {
          id: "msg-1",
          question: "How do I send a message?",
          answer: "Open a chat with a friend, type your message in the text input field at the bottom, and press Send or click the send button. You can also use Enter key to send messages quickly."
        },
        {
          id: "msg-2",
          question: "Can I send images in messages?",
          answer: "Currently, ChatApp supports text-based messaging. You can mention features or details about images in your text messages. Image sharing features are coming soon!"
        },
        {
          id: "msg-3",
          question: "What is last seen status?",
          answer: "Last seen shows when you were last active on ChatApp. You can control this privacy setting from Settings > Privacy > Online Status to show or hide when you were last seen."
        },
        {
          id: "msg-4",
          question: "What are read receipts?",
          answer: "Read receipts indicate when a friend has seen your message. You can toggle this feature from Settings > Privacy > Read Receipts. This helps you know if your message was delivered and read."
        },
        {
          id: "msg-5",
          question: "How do typing indicators work?",
          answer: "Typing indicators show when someone is composing a message. You can disable this from Settings > Privacy > Typing Indicator if you prefer privacy while typing."
        }
      ]
    },
    {
      id: "friends",
      title: "Friends & Connections",
      color: "text-blue-500",
      icon: Users,
      faqs: [
        {
          id: "friend-1",
          question: "How do I add a friend?",
          answer: "Go to the People section, find the user you want to add, and click the Add Friend button. Once they're added, you can start messaging each other immediately."
        },
        {
          id: "friend-2",
          question: "How do I see my friends list?",
          answer: "Your friends list is displayed in the sidebar or main chat section. Tap on 'Friends' or 'Chats' to view all your connections and recent conversations."
        },
        {
          id: "friend-3",
          question: "Can I remove a friend?",
          answer: "Yes, you can remove a friend by clicking the remove/delete option next to their name in your friends list. This will end your connection, but you can add them again anytime."
        },
        {
          id: "friend-4",
          question: "How do I block a user?",
          answer: "Blocking feature is available in the privacy settings. Blocked users won't be able to message you or see your online status. You can unblock them anytime from Settings > Privacy."
        }
      ]
    },
    {
      id: "account-security",
      title: "Account & Security",
      color: "text-red-500",
      icon: Lock,
      faqs: [
        {
          id: "sec-1",
          question: "How do I change my password?",
          answer: "Go to Settings > Security > Change Password. You'll receive an email with a password reset link. Click the link, create your new password (8+ characters with special character and number), and confirm."
        },
        {
          id: "sec-2",
          question: "I forgot my password, what should I do?",
          answer: "On the login page, click 'Forgot password?'. Enter your email, and we'll send you a password reset link. Click the link in the email, set a new password, and you can log in again."
        },
        {
          id: "sec-3",
          question: "How secure is my data?",
          answer: "Your data is encrypted and stored securely on our servers. We follow industry best practices for data protection. Never share your password with anyone, and always log out from shared devices."
        },
        {
          id: "sec-4",
          question: "Can I delete my account?",
          answer: "Yes, go to Settings > Danger Zone > Delete Account. This will permanently delete your account and all associated data. This action cannot be undone, so please be careful."
        },
        {
          id: "sec-5",
          question: "What is email verification?",
          answer: "Email verification confirms that you own the email address you registered with. It helps protect your account and ensures you can receive important security notifications and password resets."
        }
      ]
    },
    {
      id: "settings",
      title: "Settings & Customization",
      color: "text-violet-500",
      icon: SettingsIcon,
      faqs: [
        {
          id: "set-1",
          question: "How do I enable dark mode?",
          answer: "Go to Settings > Appearance > Dark Mode and toggle it on. Dark mode is easier on the eyes, especially in low-light environments."
        },
        {
          id: "set-2",
          question: "Can I change the message theme?",
          answer: "Yes! In Settings > Appearance > Message Theme, you can choose from multiple themes: Default, Vibrant, Pastel, Dark, and Minimal. Pick the one you like best!"
        },
        {
          id: "set-3",
          question: "How do I enable notifications?",
          answer: "Go to Settings > Notifications > Push Notifications. Toggle it on to receive alerts for new messages. You can also enable Message Sounds to hear a sound when messages arrive."
        },
        {
          id: "set-4",
          question: "How do I change my language preference?",
          answer: "Go to Settings > General > Language and select your preferred language from the dropdown. The app interface will update instantly."
        },
        {
          id: "set-5",
          question: "Where can I manage my privacy?",
          answer: "All privacy settings are in Settings > Privacy. Here you can control: Online Status, Read Receipts, and Typing Indicator. Adjust these based on your comfort level."
        }
      ]
    },
    {
      id: "profile",
      color: "text-pink-500",
      title: "Profile & Personal Info",
      icon: User,
      faqs: [
        {
          id: "prof-1",
          question: "How do I update my profile picture?",
          answer: "Go to Profile or Settings, click Edit Profile, and select a new profile picture. You can upload any image from your device. Recommended size is 512x512px."
        },
        {
          id: "prof-2",
          question: "Can I add a bio to my profile?",
          answer: "Yes! In Edit Profile, you'll find a bio section where you can add a short description about yourself. This helps friends know more about you."
        },
        {
          id: "prof-3",
          question: "How do I view another user's profile?",
          answer: "Click on a friend's name or profile picture in your chat list. You'll see their profile with their picture, bio, and other public information."
        },
        {
          id: "prof-4",
          question: "Can I customize my profile further?",
          answer: "In Edit Profile, you can customize your name, bio, profile picture, and add banner image. More customization options will be available soon!"
        }
      ]
    },
    {
      id: "troubleshooting",
      color: "text-cyan-500",
      title: "Troubleshooting",
      icon: Wrench,
      faqs: [
        {
          id: "trou-1",
          question: "Messages are not loading. What should I do?",
          answer: "Try these steps: 1) Refresh the page (F5 or Cmd+R), 2) Clear browser cache, 3) Check your internet connection, 4) Log out and log back in. If the issue persists, report a bug from Settings > Report a Bug."
        },
        {
          id: "trou-2",
          question: "I'm not receiving notifications. How do I fix this?",
          answer: "Check: 1) Settings > Notifications is enabled, 2) Browser notification permissions are granted, 3) Your device is not in silent mode, 4) Try disabling and re-enabling notifications."
        },
        {
          id: "trou-3",
          question: "I can't log in. What should I try?",
          answer: "Try: 1) Check if Caps Lock is on, 2) Verify your email and password are correct, 3) Reset your password using 'Forgot password', 4) Clear browser cookies and try again, 5) Try a different browser."
        },
        {
          id: "trou-4",
          question: "The app is running slowly. How can I improve performance?",
          answer: "Try: 1) Clear browser cache and cookies, 2) Close other open tabs, 3) Refresh the page, 4) Disable unnecessary notifications, 5) Try a different browser, 6) Check your internet connection speed."
        },
        {
          id: "trou-5",
          question: "I found a bug in the app. How do I report it?",
          answer: "Go to Settings > Support > Report a Bug. Fill in the bug details, select severity level, add screenshots if possible, and submit. Our team will review it and get back to you soon!"
        }
      ]
    }
  ], []);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return helpCategories;

    return helpCategories
      .map((category) => ({
        ...category,
        faqs: category.faqs.filter(
          (faq) =>
            faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }))
      .filter((category) => category.faqs.length > 0);
  }, [searchQuery, helpCategories]);

  const toggleExpanded = useCallback((id) => {
    setExpandedId((prevId) => (prevId === id ? null : id));
  }, []);

  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const textDarkMode = isDarkMode ? 'text-white' : 'text-gray-900';

  return (
    <div className={`min-h-screen flex flex-col ${textDarkMode} relative`}>

      {/* Header */}
      <div className={`sticky top-0 z-20 backdrop-blur-sm border-b${ isDarkMode ? ' border-zinc-700 bg-zinc-900/70' : ' border-gray-200 bg-white/70' }`}>
        <div className="p-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className={`p-2 rounded-xl ${isDarkMode ? 'hover:bg-gray-100' : 'hover:bg-zinc-800'} transition-all`}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className={`text-xl font-bold ${ isDarkMode ? 'text-white' : 'text-gray-900' }`}>
              Help Center
            </h2>
            <p className={`text-sm ${ isDarkMode ? 'text-gray-300' : 'text-gray-600' }`}>
              Find answers to your questions
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto relative z-10">
        <div className="max-w-3xl mx-auto">
          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search help articles..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setExpandedId(null);
                }}
                className={`w-full pl-10 pr-4 py-3 border  rounded-lg   ${isDarkMode ? 'border-zinc-600 bg-zinc-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4f38f7] focus:border-transparent' : 'border-gray-300 bg-white  text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#4f38f7] focus:border-transparent'}`}
              />
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-6">
            {filteredCategories.map((category) => (
              <div key={category.id} className="space-y-3">
                <div className="flex items-center gap-3 mb-4">
                  <category.icon className={`w-6 h-6 ${category.color}`} />
                  <h3 className={`text-lg font-semibold ${textDarkMode}`}>
                    {category.title}
                  </h3>
                </div>

                <div className="space-y-2">
                  {category.faqs.map((faq) => (
                    <div
                      key={faq.id}
                      className={`border rounded-lg overflow-hidden ${isDarkMode ? 'border-zinc-700 bg-zinc-800/50' : 'border-gray-200 bg-white'}`}
                    >
                      <button
                        onClick={() => toggleExpanded(faq.id)}
                        className={`w-full px-4 py-4 flex items-center justify-between ${isDarkMode ? 'hover:bg-gray-50 dark:hover:bg-zinc-700/30' : 'hover:bg-gray-50 dark:hover:bg-zinc-700/30'} transition-colors text-left`}
                      >
                        <span className={`font-medium ${textDarkMode}`}>
                          {faq.question}
                        </span>
                        {expandedId === faq.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-400 shrink-0 ml-2" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400 shrink-0 ml-2" />
                        )}
                      </button>

                      {expandedId === faq.id && (
                        <div className={`px-4 py-4 border-t ${isDarkMode ? 'border-zinc-700 bg-zinc-900/30' : 'border-gray-200 bg-gray-50'}`}>
                          <p className={`leading-relaxed ${textDarkMode}`}>
                            {faq.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {filteredCategories.length === 0 && (
              <div className="text-center py-12">
                <HelpCircle className={`w-12 h-12 mx-auto mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  No help articles found for "{searchQuery}"
                </p>
                <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Try searching with different keywords or browse the categories above
                </p>
              </div>
            )}
          </div>

          {/* Contact Support Section */}
          {filteredCategories.length > 0 && (
            <div className={`mt-12 p-6 ${isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border rounded-lg`}>
              <h3 className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                Still need help?
              </h3>
              <p className={`mb-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                If you couldn't find the answer to your question, you can:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <button
                  onClick={() => navigate("/report-bug")}
                  className={`flex items-center gap-3 p-4 ${isDarkMode ? 'bg-zinc-800 border-blue-800 hover:bg-zinc-700' : 'bg-white border-blue-200 hover:bg-gray-50'} rounded-lg transition-colors text-left border`}
                >
                  <MessageSquare className="w-5 h-5 text-green-500" />
                  <div>
                    <p className={`font-medium ${textDarkMode}`}>
                      Report a Bug
                    </p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Found an issue? Let us know
                    </p>
                  </div>
                </button>
                <div className={`flex items-center gap-3 p-4 rounded-lg border ${isDarkMode ? 'border-blue-800 bg-zinc-800' : 'border-blue-200 bg-white'}`}>
                  <HelpCircle className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className={`font-medium ${textDarkMode}`}>
                      Email Support
                    </p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      support@chatapp.com
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tips Section */}
          <div className="mt-12 p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">
                Tips for a better experience
              </h3>
            </div>
            <ul className="text-green-700 dark:text-green-400 space-y-2 text-sm">
              <li>• Enable notifications to stay updated with new messages</li>
              <li>• Use dark mode for a comfortable viewing experience</li>
              <li>• Verify your email for enhanced account security</li>
              <li>• Check your privacy settings to control what you share</li>
              <li>• Keep your password strong and don't share it with anyone</li>
              <li>• Clear your browser cache if you experience performance issues</li>
            </ul>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-gray-500 dark:text-gray-600 text-sm pb-8">
            <p>Last updated: January 2026</p>
            <p className="mt-2">ChatApp Help Center v1.0</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(HelpCenter);
