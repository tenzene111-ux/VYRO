export type User = {
  id: string;
  name: string;
  username: string;
  verified?: boolean;
  bio?: string;
  location?: string;
  website?: string;
  online?: boolean;
  followers?: number;
  following?: number;
  friends?: number;
  posts?: number;
};

export const currentUser: User = {
  id: "u0",
  name: "Tenzin Norbu",
  username: "tenzinnorbu",
  verified: true,
  bio: "Dreamer | Traveler | Creator\nLiving life and sharing good vibes ✨",
  location: "Bhutan",
  online: true,
  followers: 18200,
  following: 1100,
  friends: 2600,
  posts: 342,
};

export const users: User[] = [
  currentUser,
  { id: "u1", name: "Sonam Wangdi", username: "sonamw", online: true, verified: false },
  { id: "u2", name: "Pema Choden", username: "pemachoden", online: true },
  { id: "u3", name: "Tashi Gang", username: "tashigang", online: false },
  { id: "u4", name: "Kinley Dorji", username: "kinleydorji", online: true },
  { id: "u5", name: "Passang Lhamo", username: "passangl", online: false },
  { id: "u6", name: "Jigme Dorji", username: "jigmedorji", online: false },
  { id: "u7", name: "Kelzang Choden", username: "kelzangc", online: true },
  { id: "u8", name: "Ugyen Rinzin", username: "ugyenr", online: true },
  { id: "u9", name: "Dechen Yangki", username: "dechenY", online: false },
  { id: "u10", name: "Karma Wangchuk", username: "karmaw", online: true },
];

export const byId = (id: string) => users.find((u) => u.id === id)!;

export type Story = {
  id: string;
  userId: string;
  seen: boolean;
  time: string;
  caption?: string;
};

export const stories: Story[] = [
  { id: "s1", userId: "u1", seen: false, time: "2h ago", caption: "Sunrise trek 🏔️" },
  { id: "s2", userId: "u2", seen: false, time: "1h ago", caption: "Festival vibes" },
  { id: "s3", userId: "u3", seen: true, time: "3h ago", caption: "Night market lights" },
  { id: "s4", userId: "u4", seen: false, time: "40m ago", caption: "Coffee & code ☕" },
  { id: "s5", userId: "u7", seen: true, time: "5h ago", caption: "Studio session" },
  { id: "s6", userId: "u8", seen: false, time: "20m ago", caption: "Live from Paro" },
];

export type Post = {
  id: string;
  userId: string;
  time: string;
  location?: string;
  text: string;
  hasMedia: boolean;
  mediaCount?: number;
  likes: number;
  comments: number;
  shares: number;
  reactions: string[];
};

export const posts: Post[] = [
  {
    id: "p1",
    userId: "u1",
    time: "2h",
    location: "Paro, Bhutan",
    text: "Sunsets in the mountains never get old. 🏔️❤️",
    hasMedia: true,
    mediaCount: 8,
    likes: 12800,
    comments: 245,
    shares: 103,
    reactions: ["❤️", "🔥", "😍"],
  },
  {
    id: "p2",
    userId: "u2",
    time: "5h",
    location: "Thimphu",
    text: "Happiness is homemade 🍲",
    hasMedia: true,
    mediaCount: 1,
    likes: 3421,
    comments: 88,
    shares: 12,
    reactions: ["❤️", "😋"],
  },
  {
    id: "p3",
    userId: "u4",
    time: "8h",
    text: "Shipped a big update to the studio tonight. Feels good to build things that matter. What are you working on this week?",
    hasMedia: false,
    likes: 962,
    comments: 54,
    shares: 6,
    reactions: ["🔥", "👏"],
  },
  {
    id: "u7post",
    userId: "u7",
    time: "10h",
    location: "Thimphu Live House",
    text: "New track dropping this weekend 🎶 who's ready?",
    hasMedia: true,
    mediaCount: 3,
    likes: 5210,
    comments: 340,
    shares: 210,
    reactions: ["🔥", "🎶", "❤️"],
  },
  {
    id: "p5",
    userId: "u8",
    time: "1d",
    location: "Punakha",
    text: "Poll: which season is Bhutan most beautiful in? 🍁❄️🌸",
    hasMedia: false,
    likes: 640,
    comments: 210,
    shares: 4,
    reactions: ["🤔", "❤️"],
  },
];

export type Message = {
  id: string;
  from: "me" | string;
  text?: string;
  kind: "text" | "image" | "voice" | "system";
  time: string;
  status?: "sent" | "delivered" | "read";
  duration?: string;
};

export type Conversation = {
  id: string;
  userId: string;
  lastMessage: string;
  time: string;
  unread: number;
  pinned?: boolean;
  muted?: boolean;
  typing?: boolean;
  kind?: "voice" | "photo" | "text";
  messages: Message[];
};

export const conversations: Conversation[] = [
  {
    id: "c1",
    userId: "u1",
    lastMessage: "Sure! Count me in.",
    time: "10:34 AM",
    unread: 0,
    pinned: true,
    messages: [
      { id: "m1", from: "u1", kind: "text", text: "Hey Tenzin! 👋\nHow was your trip?", time: "10:30 AM" },
      { id: "m2", from: "me", kind: "text", text: "It was amazing 😍 I'll share some photos.", time: "10:31 AM", status: "read" },
      { id: "m3", from: "me", kind: "image", time: "10:32 AM", status: "read" },
      { id: "m4", from: "me", kind: "voice", duration: "0:18", time: "10:32 AM", status: "read" },
      { id: "m5", from: "u1", kind: "text", text: "Wow! Looks stunning 🔥", time: "10:33 AM" },
      { id: "m6", from: "me", kind: "text", text: "Let's catch up this weekend?", time: "10:34 AM", status: "delivered" },
      { id: "m7", from: "u1", kind: "text", text: "Sure! Count me in.", time: "10:34 AM" },
    ],
  },
  {
    id: "c2",
    userId: "u2",
    lastMessage: "See you soon!",
    time: "5m",
    unread: 1,
    messages: [
      { id: "m1", from: "u2", kind: "text", text: "Are we still on for 6pm?", time: "9:40 AM" },
      { id: "m2", from: "me", kind: "text", text: "Yes! Heading out now.", time: "9:41 AM", status: "read" },
      { id: "m3", from: "u2", kind: "text", text: "See you soon!", time: "9:42 AM" },
    ],
  },
  {
    id: "c3",
    userId: "u3",
    lastMessage: "Tashi: Let's meet tomorrow",
    time: "1h",
    unread: 5,
    messages: [{ id: "m1", from: "u3", kind: "text", text: "Let's meet tomorrow", time: "1h ago" }],
  },
  {
    id: "c4",
    userId: "u4",
    lastMessage: "🎤 Voice message",
    time: "2h",
    unread: 0,
    kind: "voice",
    messages: [{ id: "m1", from: "u4", kind: "voice", duration: "0:42", time: "2h ago" }],
  },
  {
    id: "c5",
    userId: "u5",
    lastMessage: "Thank you!",
    time: "3h",
    unread: 0,
    messages: [{ id: "m1", from: "u5", kind: "text", text: "Thank you!", time: "3h ago" }],
  },
  {
    id: "c6",
    userId: "u6",
    lastMessage: "21 May, 9:05 PM",
    time: "1d",
    unread: 0,
    muted: true,
    messages: [{ id: "m1", from: "u6", kind: "text", text: "Catch you later.", time: "1d ago" }],
  },
];

export type Call = {
  id: string;
  userId: string;
  time: string;
  type: "voice" | "video";
  direction: "in" | "out" | "missed";
};

export const calls: Call[] = [
  { id: "cl1", userId: "u2", time: "Today, 9:32 AM", type: "video", direction: "out" },
  { id: "cl2", userId: "u4", time: "Yesterday, 8:15 PM", type: "voice", direction: "missed" },
  { id: "cl3", userId: "u3", time: "Yesterday, 7:45 PM", type: "video", direction: "in" },
  { id: "cl4", userId: "u1", time: "Yesterday, 5:20 PM", type: "voice", direction: "out" },
  { id: "cl5", userId: "u5", time: "Yesterday, 3:10 PM", type: "voice", direction: "missed" },
  { id: "cl6", userId: "u6", time: "21 May, 9:05 PM", type: "voice", direction: "in" },
];

export type Group = {
  id: string;
  name: string;
  privacy: "Public" | "Private" | "Secret";
  members: number;
};

export const groups: Group[] = [
  { id: "g1", name: "Travel Lovers", privacy: "Private", members: 2400 },
  { id: "g2", name: "Bhutan Photography", privacy: "Private", members: 1800 },
  { id: "g3", name: "College Friends", privacy: "Private", members: 563 },
  { id: "g4", name: "Entrepreneurs Hub", privacy: "Private", members: 3100 },
  { id: "g5", name: "Music Vibes", privacy: "Public", members: 5600 },
  { id: "g6", name: "Design Creators", privacy: "Private", members: 1200 },
];

export type LiveStream = {
  id: string;
  userId: string;
  title: string;
  viewers: number;
  category: string;
};

export const liveStreams: LiveStream[] = [
  { id: "l1", userId: "u7", title: "Studio session — new EP 🎶", viewers: 2400, category: "Music" },
  { id: "l2", userId: "u8", title: "Live from Paro Tshechu", viewers: 1120, category: "Travel" },
  { id: "l3", userId: "u10", title: "Late night coding stream", viewers: 340, category: "Gaming" },
];

export type Notification = {
  id: string;
  category: "mentions" | "likes" | "comments" | "friends" | "followers" | "groups" | "live" | "system";
  userIds: string[];
  text: string;
  time: string;
  read: boolean;
};

export const notifications: Notification[] = [
  { id: "n1", category: "likes", userIds: ["u1", "u2", "u4"], text: "and 9 others reacted to your post", time: "2m", read: false },
  { id: "n2", category: "comments", userIds: ["u3"], text: "commented: \"This is beautiful! 😍\"", time: "12m", read: false },
  { id: "n3", category: "friends", userIds: ["u9"], text: "sent you a friend request", time: "38m", read: false },
  { id: "n4", category: "followers", userIds: ["u10"], text: "started following you", time: "1h", read: true },
  { id: "n5", category: "mentions", userIds: ["u7"], text: "mentioned you in a comment", time: "3h", read: true },
  { id: "n6", category: "live", userIds: ["u8"], text: "is live now: Paro Tshechu", time: "4h", read: true },
  { id: "n7", category: "groups", userIds: ["u6"], text: "posted in Design Creators", time: "6h", read: true },
  { id: "n8", category: "system", userIds: [], text: "Your weekly VYRO recap is ready", time: "1d", read: true },
];

export const trendingTopics = [
  { tag: "#ParoTshechu2024", posts: "12.5K posts" },
  { tag: "#WeekendVibes", posts: "8.7K posts" },
  { tag: "#MountainDiaries", posts: "5.2K posts" },
  { tag: "#DesignCreators", posts: "3.1K posts" },
];

export const exploreCategories = [
  { id: "trending", label: "Trending", icon: "flame" },
  { id: "music", label: "Music", icon: "music" },
  { id: "travel", label: "Travel", icon: "plane" },
  { id: "gaming", label: "Gaming", icon: "gamepad" },
  { id: "sports", label: "Sports", icon: "trophy" },
  { id: "art", label: "Art & Design", icon: "palette" },
];

export const giftCatalog = [
  { id: "gi1", name: "Heart", price: 1, emoji: "❤️", rarity: "Common" },
  { id: "gi2", name: "Rose Bouquet", price: 10, emoji: "💐", rarity: "Common" },
  { id: "gi3", name: "Snow Lion", price: 250, emoji: "🦁", rarity: "Rare" },
  { id: "gi4", name: "Prayer Flags", price: 500, emoji: "🎏", rarity: "Rare" },
  { id: "gi5", name: "Golden Dragon", price: 2000, emoji: "🐉", rarity: "Epic" },
  { id: "gi6", name: "VYRO Crown", price: 10000, emoji: "👑", rarity: "Legendary" },
];
