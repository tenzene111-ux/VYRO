import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { UIProvider } from "./context/UIContext";
import { AuthProvider } from "./context/AuthContext";
import { Shell } from "./components/Shell";
import { ComingSoon } from "./components/ComingSoon";
import { RequireAuth } from "./components/RequireAuth";

import { Splash } from "./screens/Splash";
import { Login } from "./screens/Login";
import { Signup } from "./screens/Signup";
import { Onboarding } from "./screens/Onboarding";
import { Home } from "./screens/Home";
import { Explore } from "./screens/Explore";
import { Profile } from "./screens/Profile";
import { Notifications } from "./screens/Notifications";
import { CreatePost } from "./screens/CreatePost";
import { StoryViewer } from "./screens/StoryViewer";
import { Live } from "./screens/Live";
import { LiveView } from "./screens/LiveView";
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

                <Route path="/create/story" element={<ComingSoon title="Create Story" description="Photo, video, text and music story templates." />} />
                <Route path="/create/reel" element={<ComingSoon title="Short Video" description="Camera, effects, filters and trimming." />} />
                <Route path="/create/group" element={<ComingSoon title="Create Group" description="Configure a public, private or secret group." />} />
                <Route path="/create/event" element={<ComingSoon title="Create Event" description="Date, location, description and invites." />} />
                <Route path="/create/sell" element={<ComingSoon title="Sell on Marketplace" description="List a product with photos and price." />} />

                <Route path="/live" element={<Live />} />
                <Route path="/live/go" element={<ComingSoon title="Go Live" description="Public, friends-only or private live streaming." />} />

                <Route path="/wallet" element={<ComingSoon title="VYRO Wallet" description="Balance, gifts, transactions and secure payments — launching soon." />} />
                <Route path="/studio" element={<ComingSoon title="Creator Studio" description="Analytics, earnings and audience insights for creators." />} />
                <Route path="/marketplace" element={<ComingSoon title="Marketplace" description="Buy and sell within your VYRO community." />} />
                <Route path="/events" element={<ComingSoon title="Events" description="Discover and host events near you." />} />
                <Route path="/privacy" element={<ComingSoon title="Privacy & Security" description="Control who sees your world." />} />
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
              <Route path="/live/:id" element={<LiveView />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </UIProvider>
    </AuthProvider>
  );
}
