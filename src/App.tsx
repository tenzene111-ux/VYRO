import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
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
import { CreatePost } from "./screens/CreatePost";
import { CreateGroup } from "./screens/CreateGroup";
import { CreateEvent } from "./screens/CreateEvent";
import { CreateListing } from "./screens/CreateListing";
import { CreateStory } from "./screens/CreateStory";
import { Marketplace } from "./screens/Marketplace";
import { Events } from "./screens/Events";
import { Wallet } from "./screens/Wallet";
import { CreatorStudio } from "./screens/CreatorStudio";
import { StoryViewer } from "./screens/StoryViewer";
import { Live } from "./screens/Live";
import { VideoFeed } from "./screens/VideoFeed";
import { PrivacySecurity } from "./screens/PrivacySecurity";
import { ShortsStudio } from "./screens/shorts/ShortsStudio";
import { ShortsCamera } from "./screens/shorts/ShortsCamera";
import { ShortsUpload } from "./screens/shorts/ShortsUpload";
import { ShortsEditor } from "./screens/shorts/ShortsEditor";
import { ShortsPublish } from "./screens/shorts/ShortsPublish";
import { GoLive } from "./screens/GoLive";
import { LiveRoom } from "./screens/LiveRoom";
import { LiveReplay } from "./screens/LiveReplay";
import { VoiceCall } from "./screens/VoiceCall";
import { VideoCall } from "./screens/VideoCall";

import { ChatShell } from "./screens/chat/ChatShell";
import { ChatList } from "./screens/chat/ChatList";
import { CallsTab } from "./screens/chat/CallsTab";
import { PeopleTab } from "./screens/chat/PeopleTab";
import { GroupsTab } from "./screens/chat/GroupsTab";
import { ChatSettingsTab } from "./screens/chat/ChatSettingsTab";
import { Conversation } from "./screens/chat/Conversation";
import { GroupChat } from "./screens/chat/GroupChat";

export default function App() {
  return (
    <AuthProvider>
      <UIProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <CallProvider>
            <IncomingCallOverlay />
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
                <Route path="/create/reel/edit/:id" element={<ShortsEditor />} />
                <Route path="/create/reel/publish/:id" element={<ShortsPublish />} />
                <Route path="/live/:id" element={<LiveRoom />} />
                <Route path="/live/:id/replay" element={<LiveReplay />} />
                <Route path="/watch/:postId" element={<VideoFeed />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </CallProvider>
        </BrowserRouter>
      </UIProvider>
    </AuthProvider>
  );
}
