import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { UIProvider } from "./context/UIContext";
import { AuthProvider } from "./context/AuthContext";
import { CallProvider } from "./context/CallContext";
import { Shell } from "./components/Shell";
import { RequireAuth } from "./components/RequireAuth";
import { IncomingCallOverlay } from "./components/IncomingCallOverlay";

import { Splash } from "./screens/Splash";
import { Login } from "./screens/Login";
import { Signup } from "./screens/Signup";
import { Onboarding } from "./screens/Onboarding";
import { Home } from "./screens/Home";
import { Explore } from "./screens/Explore";
import { Profile } from "./screens/Profile";
import { Notifications } from "./screens/Notifications";

import { ChatShell } from "./screens/chat/ChatShell";
import { ChatList } from "./screens/chat/ChatList";

const CreatePost = lazy(() => import("./screens/CreatePost").then((m) => ({ default: m.CreatePost })));
const CreateGroup = lazy(() => import("./screens/CreateGroup").then((m) => ({ default: m.CreateGroup })));
const CreateEvent = lazy(() => import("./screens/CreateEvent").then((m) => ({ default: m.CreateEvent })));
const CreateListing = lazy(() => import("./screens/CreateListing").then((m) => ({ default: m.CreateListing })));
const CreateStory = lazy(() => import("./screens/CreateStory").then((m) => ({ default: m.CreateStory })));
const Marketplace = lazy(() => import("./screens/Marketplace").then((m) => ({ default: m.Marketplace })));
const Events = lazy(() => import("./screens/Events").then((m) => ({ default: m.Events })));
const Wallet = lazy(() => import("./screens/Wallet").then((m) => ({ default: m.Wallet })));
const CreatorStudio = lazy(() => import("./screens/CreatorStudio").then((m) => ({ default: m.CreatorStudio })));
const VideoAnalytics = lazy(() => import("./screens/VideoAnalytics").then((m) => ({ default: m.VideoAnalytics })));
const StoryViewer = lazy(() => import("./screens/StoryViewer").then((m) => ({ default: m.StoryViewer })));
const Live = lazy(() => import("./screens/Live").then((m) => ({ default: m.Live })));
const VideoFeed = lazy(() => import("./screens/VideoFeed").then((m) => ({ default: m.VideoFeed })));
const PrivacySecurity = lazy(() => import("./screens/PrivacySecurity").then((m) => ({ default: m.PrivacySecurity })));
const ShortsStudio = lazy(() => import("./screens/shorts/ShortsStudio").then((m) => ({ default: m.ShortsStudio })));
const ShortsCamera = lazy(() => import("./screens/shorts/ShortsCamera").then((m) => ({ default: m.ShortsCamera })));
const ShortsUpload = lazy(() => import("./screens/shorts/ShortsUpload").then((m) => ({ default: m.ShortsUpload })));
const ShortsDuet = lazy(() => import("./screens/shorts/ShortsDuet").then((m) => ({ default: m.ShortsDuet })));
const ShortsEditor = lazy(() => import("./screens/shorts/ShortsEditor").then((m) => ({ default: m.ShortsEditor })));
const ShortsPublish = lazy(() => import("./screens/shorts/ShortsPublish").then((m) => ({ default: m.ShortsPublish })));
const GoLive = lazy(() => import("./screens/GoLive").then((m) => ({ default: m.GoLive })));
const LiveRoom = lazy(() => import("./screens/LiveRoom").then((m) => ({ default: m.LiveRoom })));
const LiveReplay = lazy(() => import("./screens/LiveReplay").then((m) => ({ default: m.LiveReplay })));
const VoiceCall = lazy(() => import("./screens/VoiceCall").then((m) => ({ default: m.VoiceCall })));
const VideoCall = lazy(() => import("./screens/VideoCall").then((m) => ({ default: m.VideoCall })));

const CallsTab = lazy(() => import("./screens/chat/CallsTab").then((m) => ({ default: m.CallsTab })));
const PeopleTab = lazy(() => import("./screens/chat/PeopleTab").then((m) => ({ default: m.PeopleTab })));
const GroupsTab = lazy(() => import("./screens/chat/GroupsTab").then((m) => ({ default: m.GroupsTab })));
const ChatSettingsTab = lazy(() => import("./screens/chat/ChatSettingsTab").then((m) => ({ default: m.ChatSettingsTab })));
const Conversation = lazy(() => import("./screens/chat/Conversation").then((m) => ({ default: m.Conversation })));
const GroupChat = lazy(() => import("./screens/chat/GroupChat").then((m) => ({ default: m.GroupChat })));

function RouteFallback() {
  return (
    <div className="flex h-svh w-full items-center justify-center bg-void">
      <Loader2 className="h-6 w-6 animate-spin text-mist" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <UIProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <CallProvider>
            <IncomingCallOverlay />
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Splash />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />

                <Route element={<RequireAuth><Outlet /></RequireAuth>}>
                  <Route path="/onboarding" element={<Onboarding />} />

                  <Route element={<Shell />}>
                    <Route path="/home" element={<Home />} />
                    <Route path="/explore" element={<Explore />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/profile/:id" element={<Profile />} />

                    <Route path="/live" element={<Live />} />
                    <Route path="/live/go" element={<GoLive />} />

                    <Route path="/marketplace" element={<Marketplace />} />
                    <Route path="/events" element={<Events />} />
                    <Route path="/wallet" element={<Wallet />} />
                    <Route path="/studio" element={<CreatorStudio />} />
                    <Route path="/studio/analytics/:postId" element={<VideoAnalytics />} />
                    <Route path="/privacy" element={<PrivacySecurity />} />
                  </Route>

                  <Route path="/chat" element={<ChatShell />}>
                    <Route index element={<ChatList />} />
                    <Route path="calls" element={<CallsTab />} />
                    <Route path="people" element={<PeopleTab />} />
                    <Route path="groups" element={<GroupsTab />} />
                    <Route path="settings" element={<ChatSettingsTab />} />
                  </Route>

                  <Route path="/chat/:id" element={<Conversation />} />
                  <Route path="/chat/group/:id" element={<GroupChat />} />
                  <Route path="/stories/:userId" element={<StoryViewer />} />
                  <Route path="/call/voice/:id" element={<VoiceCall />} />
                  <Route path="/call/video/:id" element={<VideoCall />} />
                  <Route path="/create/post" element={<CreatePost />} />
                  <Route path="/create/group" element={<CreateGroup />} />
                  <Route path="/create/event" element={<CreateEvent />} />
                  <Route path="/create/sell" element={<CreateListing />} />
                  <Route path="/create/story" element={<CreateStory />} />
                  <Route path="/create/reel" element={<ShortsStudio />} />
                  <Route path="/create/reel/camera" element={<ShortsCamera />} />
                  <Route path="/create/reel/upload" element={<ShortsUpload />} />
                  <Route path="/create/reel/duet/:postId" element={<ShortsDuet />} />
                  <Route path="/create/reel/edit/:id" element={<ShortsEditor />} />
                  <Route path="/create/reel/publish/:id" element={<ShortsPublish />} />
                  <Route path="/live/:id" element={<LiveRoom />} />
                  <Route path="/live/:id/replay" element={<LiveReplay />} />
                  <Route path="/watch/:postId" element={<VideoFeed />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </CallProvider>
        </BrowserRouter>
      </UIProvider>
    </AuthProvider>
  );
}
