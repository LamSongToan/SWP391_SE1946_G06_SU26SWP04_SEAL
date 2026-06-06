import { useEffect, useMemo, useRef, useState } from "react";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PsychologyRoundedIcon from "@mui/icons-material/PsychologyRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import DomainVerificationRoundedIcon from "@mui/icons-material/DomainVerificationRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import PermIdentityRoundedIcon from "@mui/icons-material/PermIdentityRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import { authStorage, http, logout, resolveAssetUrl } from "../api/http";
import { useSearchParams } from "react-router-dom";
import AccountApprovalPanel from "../components/coordinator/AccountApprovalPanel";
import EventConfigurationPanel from "../components/coordinator/EventConfigurationPanel";
import UserProfilePanel from "../components/profile/UserProfilePanel";
import UserDirectoryPanel from "../components/user/UserDirectoryPanel";
import ChangePasswordPage from "./ChangePasswordPage";
import TeamManagementPanel from "../components/team/TeamManagementPanel";
import { brand, roleColors, roleLabels } from "../styles/designTokens";

const DRAWER_WIDTH = 270;

const APP_NAME = "SEAL";

const STUDENT_CORE_NAV = [
  { key: "teams", label: "My Teams", icon: <GroupsRoundedIcon fontSize="small" /> },
];

const COORDINATOR_CORE_NAV = [
  { key: "users", label: "User Management", icon: <ManageAccountsRoundedIcon fontSize="small" /> },
  { key: "event-config", label: "Event Configuration", icon: <EventRoundedIcon fontSize="small" /> },
];

const MENTOR_CORE_NAV = [
  { key: "mentor-teams", label: "Mentor Teams", icon: <PsychologyRoundedIcon fontSize="small" /> },
  { key: "mentor-notes", label: "Mentor Notes", icon: <GroupsRoundedIcon fontSize="small" /> },
];

const JUDGE_CORE_NAV = [
  { key: "judge-rounds", label: "Assigned Rounds", icon: <GavelRoundedIcon fontSize="small" /> },
  { key: "scoring", label: "Scoring Queue", icon: <AssignmentTurnedInRoundedIcon fontSize="small" /> },
];

const ACCOUNT_NAV = [
  { key: "directory", label: "User Directory", icon: <SearchRoundedIcon fontSize="small" /> },
  { key: "account", label: "Profile", icon: <PermIdentityRoundedIcon fontSize="small" /> },
  { key: "password", label: "Change Password", icon: <LockRoundedIcon fontSize="small" /> },
];

const EVENT_DRAFT_STORAGE_PREFIX = "seal-event-config-draft:";
const PROFILE_DRAFT_STORAGE_KEY = "seal-profile-draft";

function getEventDraftStorageKey(eventId) {
  return `${EVENT_DRAFT_STORAGE_PREFIX}${eventId}`;
}

function getAvatarInitials(profile = {}, auth = {}) {
  const source = (profile?.fullName || auth?.fullName || profile?.username || auth?.username || "U").trim();
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  }
  const compact = source.replace(/[^a-zA-Z0-9]/g, "");
  return (compact.slice(0, 2) || "U").toUpperCase();
}

function withAssetVersion(url, version) {
  if (!url || !version) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${version}`;
}

function normalizeStatus(status) {
  const value = String(status || "").trim().toUpperCase();
  if (value === "PENDING" || value === "PENDINGAPPROVAL") return "PENDING_APPROVAL";
  if (value === "APPROVED") return "ACTIVE";
  return value.replace(/\s+/g, "_");
}

function pickDeadline(teams = []) {
  return teams.find((team) => team.nextDeadline || team.submissionDeadline)?.nextDeadline
    || teams.find((team) => team.submissionDeadline)?.submissionDeadline
    || "No deadline yet";
}

function DashboardOverview({ auth, currentRole, profileSummary, avatarInitials, stats }) {
  const displayName = profileSummary?.fullName || auth?.fullName || auth?.username || "SEAL participant";
  const isLeader = currentRole === "STUDENT" && stats.leaderTeams > 0;
  const displayRole = isLeader ? "TEAM_LEADER" : currentRole;
  const secondaryRoles = (auth?.roles || []).filter((role) => {
    if (role === displayRole || role === currentRole) return false;
    if (displayRole === "TEAM_LEADER" && role === "STUDENT") return false;
    return true;
  });
  const cards = (() => {
    if (currentRole === "COORDINATOR") {
      return [
        ["Active Hackathons", stats.activeEvents, EventRoundedIcon, "Events currently open, ongoing, or scoring"],
        ["Registered Teams", stats.registeredTeams, GroupsRoundedIcon, "Total teams across configured events"],
        ["Pending Accounts", stats.pendingAccounts, ManageAccountsRoundedIcon, "Accounts waiting for approval before demo"],
      ];
    }
    if (currentRole === "JUDGE") {
      return [
        ["Submissions to Score", stats.pendingScores, AssignmentTurnedInRoundedIcon, "Waiting for Sprint 2 scoring APIs"],
        ["Judging Schedule", stats.judgeSchedule, CalendarMonthRoundedIcon, "Assigned rounds will appear here"],
        ["Score History", stats.scoreHistory, GavelRoundedIcon, "Track submitted scores"],
      ];
    }
    if (currentRole === "MENTOR") {
      return [
        ["Mentored Teams", stats.mentorTeams, PsychologyRoundedIcon, "Assigned teams will appear here"],
        ["Meetings", stats.mentorMeetings, CalendarMonthRoundedIcon, "Track upcoming check-ins"],
        ["Follow-up Notes", stats.mentorNotes, GroupsRoundedIcon, "Mentoring notes arrive in Sprint 2"],
      ];
    }
    return [
      ["Current Team", stats.activeTeams, GroupsRoundedIcon, isLeader ? "You are currently a Team Leader" : "Team Member workspace"],
      ["Submission Deadline", stats.nextDeadline, CalendarMonthRoundedIcon, "Track the nearest submission milestone"],
      ["Current Round", stats.currentRound, EmojiEventsRoundedIcon, "Round data updates from the active event"],
    ];
  })();

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          p: { xs: 2.4, md: 3 },
              borderRadius: brand.radius.xl,
              color: brand.colors.inverse,
              background:
                "linear-gradient(118deg, rgba(7,26,47,0.98) 0%, rgba(13,42,71,0.95) 54%, rgba(243,112,33,0.86) 140%)",
              boxShadow: "0 22px 56px rgba(7, 26, 47, 0.18)",
              mb: 2,
              border: "1px solid rgba(255,255,255,0.16)",
              "&:before": {
                content: '""',
                position: "absolute",
                inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          },
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2.5} sx={{ position: "relative", zIndex: 1 }}>
          <Stack direction="row" spacing={1.8} alignItems="center">
            <Avatar
              src={withAssetVersion(resolveAssetUrl(profileSummary?.avatarUrl), profileSummary?.__avatarVersion) || undefined}
              sx={{ width: 64, height: 64, bgcolor: brand.colors.orange, border: "3px solid rgba(255,255,255,0.2)", fontSize: 20, fontWeight: 900 }}
            >
              {avatarInitials}
            </Avatar>
            <Box>
              <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 800 }}>
                SEAL Dashboard
              </Typography>
              <Typography component="h1" sx={{ color: brand.colors.inverse, fontSize: { xs: 26, md: 34 }, fontWeight: 950, lineHeight: 1.12 }}>
                Hello, {displayName}!
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.72)", fontSize: 14, mt: 0.6 }}>
                Track your work, teams, deadlines, and Hackathon tasks.
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label={roleLabels[displayRole] || displayRole}
              color={roleColors[displayRole] || "default"}
              sx={{ bgcolor: brand.colors.surface, color: brand.colors.navy, fontWeight: 950 }}
            />
            {secondaryRoles.slice(0, 3).map((role) => (
              <Chip key={role} label={roleLabels[role] || role} sx={{ bgcolor: "rgba(255,255,255,0.12)", color: brand.colors.inverse, fontWeight: 800 }} />
            ))}
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, gap: 1.6 }}>
        {cards.map(([label, value, Icon, hint]) => (
          <Box
            key={label}
            sx={{
              p: 2.2,
              borderRadius: brand.radius.lg,
              bgcolor: brand.colors.surface,
              border: `1px solid ${brand.colors.line}`,
              boxShadow: brand.shadow.sm,
              minHeight: 132,
              transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
              "&:hover": {
                transform: "translateY(-3px)",
                borderColor: "rgba(243,112,33,0.3)",
                boxShadow: "0 18px 42px rgba(7, 26, 47, 0.12)",
              },
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
              <Box>
                <Typography sx={{ color: brand.colors.muted, fontSize: 12, fontWeight: 900 }}>{label}</Typography>
                <Typography sx={{ color: brand.colors.text, fontSize: typeof value === "number" ? 30 : 20, fontWeight: 950, mt: 0.7, lineHeight: 1.12 }}>
                  {value}
                </Typography>
              </Box>
              <Box sx={{ width: 44, height: 44, borderRadius: 3, bgcolor: brand.colors.surfaceWarm, color: brand.colors.orange, display: "grid", placeItems: "center", flex: "0 0 44px" }}>
                <Icon />
              </Box>
            </Stack>
            <Typography sx={{ color: brand.colors.muted, fontSize: 13, mt: 1.6 }}>{hint}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function RoleWorkspacePanel({ role, type }) {
  const isJudge = role === "JUDGE";
  const title = isJudge
    ? (type === "scoring" ? "Scoring Queue" : "Assigned Rounds")
    : (type === "notes" ? "Mentor Notes" : "Mentor Teams");
  const summary = isJudge
    ? "Judge workspace for assigned rounds, submissions, rubric status, and scoring progress."
    : "Mentor workspace for assigned teams, guidance notes, and team follow-up status.";
  const emptyMessage = isJudge
    ? "No assigned judging work is available yet. Assigned rounds will appear here after the Event Coordinator publishes the judging setup."
    : "No mentoring assignment is available yet. Assigned teams will appear here after the Event Coordinator maps mentors to tracks or teams.";
  const checklist = isJudge
    ? ["Assigned round", "Pending submissions", "Rubric completion", "Score history"]
    : ["Assigned team", "Team health", "Mentoring notes", "Upcoming check-in"];

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          p: 2.5,
          borderRadius: 3,
          bgcolor: "#FFFFFF",
          border: "1px solid #e8edf7",
          boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)",
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 800, color: "#2A3547", mb: 0.6 }}>
          {title}
        </Typography>
        <Typography color="text.secondary">{summary}</Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" },
          gap: 1.5,
        }}
      >
        {checklist.map((label) => (
          <Box
            key={label}
            sx={{
              p: 2,
              borderRadius: 3,
              bgcolor: "#F8FAFF",
              border: "1px solid #e8edf7",
            }}
          >
            <Typography sx={{ color: "#5A6A85", fontSize: 12, fontWeight: 700 }}>{label}</Typography>
            <Typography sx={{ color: "#2A3547", fontSize: 22, fontWeight: 800 }}>0</Typography>
          </Box>
        ))}
      </Box>

      <Box className="ms-empty">
        <Typography fontWeight={700}>{emptyMessage}</Typography>
        <Typography color="text.secondary" variant="body2">
          This placeholder keeps the role dashboard aligned with Sprint 1 navigation while the Sprint 2 assignment APIs are being implemented.
        </Typography>
      </Box>
    </Stack>
  );
}

export default function DashboardPage() {
  const auth = authStorage.get();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentRole = useMemo(() => {
    const roles = auth?.roles || [];
    if (roles.includes("COORDINATOR")) return "COORDINATOR";
    if (roles.includes("MENTOR")) return "MENTOR";
    if (roles.includes("JUDGE")) return "JUDGE";
    if (roles.includes("STUDENT")) return "STUDENT";
    return roles[0] || "USER";
  }, [auth?.roles]);
  const [profileSummary, setProfileSummary] = useState(null);

  const [activeKey, setActiveKey] = useState("account");
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState(searchParams.get("query") || "");
  const [hasUnsavedEventChanges, setHasUnsavedEventChanges] = useState(false);
  const [hasUnsavedProfileChanges, setHasUnsavedProfileChanges] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    activeEvents: 0,
    registeredTeams: 0,
    pendingAccounts: 0,
    activeTeams: 0,
    leaderTeams: 0,
    nextDeadline: "No deadline yet",
    currentRound: "No round yet",
    pendingScores: 0,
    judgeSchedule: 0,
    scoreHistory: 0,
    mentorTeams: 0,
    mentorMeetings: 0,
    mentorNotes: 0,
  });
  const lastApprovedSearchRef = useRef(searchParams.toString());
  const skipNextSearchGuardRef = useRef(false);
  const avatarInitials = getAvatarInitials(profileSummary, auth);

  const coreNavItems = useMemo(
    () => {
      if (currentRole === "COORDINATOR") return COORDINATOR_CORE_NAV;
      if (currentRole === "MENTOR") return MENTOR_CORE_NAV;
      if (currentRole === "JUDGE") return JUDGE_CORE_NAV;
      if (currentRole === "STUDENT") return STUDENT_CORE_NAV;
      return [];
    },
    [currentRole]
  );
  const allowedNavKeys = useMemo(
    () => new Set([...coreNavItems, ...ACCOUNT_NAV].map((item) => item.key)),
    [coreNavItems]
  );
  const sectionParam = searchParams.get("section");
  const queryParam = searchParams.get("query") || "";
  const normalizedSectionParam = useMemo(() => {
    if (["events", "tracks", "rounds"].includes(sectionParam)) {
      return "event-config";
    }
    return sectionParam;
  }, [sectionParam]);

  const pageTitle = useMemo(() => {
    const allItems = [...coreNavItems, ...ACCOUNT_NAV];
    return allItems.find((item) => item.key === activeKey)?.label || "Dashboard";
  }, [coreNavItems, activeKey]);

  const getUnsavedPromptForSearch = (searchString) => {
    const params = new URLSearchParams(searchString);
    const section = params.get("section") || "account";
    if (section === "event-config" && hasUnsavedEventChanges) {
      return "You have unsaved event changes. Leave this page without saving?";
    }
    if (section === "account" && hasUnsavedProfileChanges) {
      return "You have unsaved profile changes. Leave this page without saving?";
    }
    return "";
  };

  const clearDraftForSearch = (searchString) => {
    const params = new URLSearchParams(searchString);
    const section = params.get("section") || "account";
    if (section === "event-config") {
      const eventId = params.get("eventId");
      if (eventId) {
        sessionStorage.removeItem(getEventDraftStorageKey(eventId));
        window.dispatchEvent(new CustomEvent("seal-discard-event-draft", { detail: { eventId } }));
      }
      return;
    }
    if (section === "account") {
      sessionStorage.removeItem(PROFILE_DRAFT_STORAGE_KEY);
      window.dispatchEvent(new Event("seal-discard-profile-draft"));
    }
  };

  const confirmLeaveCurrentView = () => {
    const promptMessage = getUnsavedPromptForSearch(searchParams.toString());
    if (!promptMessage) return true;
    const discard = window.confirm(promptMessage);
    if (discard) {
      clearDraftForSearch(searchParams.toString());
    }
    return discard;
  };

  useEffect(() => {
    const nextKey = normalizedSectionParam && allowedNavKeys.has(normalizedSectionParam) ? normalizedSectionParam : "account";
    if (activeKey !== nextKey) {
      setActiveKey(nextKey);
    }
    if (normalizedSectionParam !== nextKey || sectionParam !== normalizedSectionParam) {
      const nextParams = { section: nextKey };
      if (nextKey === "directory" && queryParam.trim()) {
        nextParams.query = queryParam.trim();
      }
      setSearchParams(nextParams, { replace: true });
    }
  }, [activeKey, allowedNavKeys, normalizedSectionParam, queryParam, sectionParam, setSearchParams]);

  useEffect(() => {
    const currentSearch = searchParams.toString();
    const previousSearch = lastApprovedSearchRef.current;

    if (skipNextSearchGuardRef.current) {
      skipNextSearchGuardRef.current = false;
      lastApprovedSearchRef.current = currentSearch;
      return;
    }

    if (currentSearch === previousSearch) {
      return;
    }

    const promptMessage = getUnsavedPromptForSearch(previousSearch);
    if (promptMessage) {
      const discard = window.confirm(promptMessage);
      if (!discard) {
        skipNextSearchGuardRef.current = true;
        setSearchParams(previousSearch, { replace: true });
        return;
      }
      clearDraftForSearch(previousSearch);
    }

    lastApprovedSearchRef.current = currentSearch;
  }, [hasUnsavedEventChanges, hasUnsavedProfileChanges, searchParams, setSearchParams]);

  useEffect(() => {
    setGlobalSearch(queryParam);
  }, [queryParam]);

  useEffect(() => {
    const markSkipGuard = () => {
      skipNextSearchGuardRef.current = true;
    };

    window.addEventListener("seal-skip-next-search-guard", markSkipGuard);
    return () => {
      window.removeEventListener("seal-skip-next-search-guard", markSkipGuard);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadProfileSummary = async () => {
      try {
        const response = await http.get("/api/users/me");
        if (mounted) {
          setProfileSummary(response.data?.data || null);
        }
      } catch {
        if (mounted) {
          setProfileSummary(null);
        }
      }
    };

    const handleProfileUpdated = (event) => {
      setProfileSummary(event.detail || null);
    };

    loadProfileSummary();
    window.addEventListener("seal-profile-updated", handleProfileUpdated);
    return () => {
      mounted = false;
      window.removeEventListener("seal-profile-updated", handleProfileUpdated);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadDashboardStats = async () => {
      try {
        if (currentRole === "COORDINATOR") {
          const [eventsResult, usersResult] = await Promise.allSettled([
            http.get("/api/coordinator/events"),
            http.get("/api/coordinator/users"),
          ]);
          const events = eventsResult.status === "fulfilled" ? eventsResult.value.data?.data || [] : [];
          const users = usersResult.status === "fulfilled" ? usersResult.value.data?.data || [] : [];
          if (!mounted) return;
          setDashboardStats((current) => ({
            ...current,
            activeEvents: events.filter((event) => ["RegistrationOpen", "Ongoing", "Scoring"].includes(event.status)).length,
            registeredTeams: events.reduce((sum, event) => sum + Number(event.teamCount || event.registeredTeamCount || 0), 0),
            pendingAccounts: users.filter((user) => normalizeStatus(user.status) === "PENDING_APPROVAL").length,
          }));
          return;
        }

        if (currentRole === "STUDENT") {
          const teamsResponse = await http.get("/api/teams/my");
          const teams = teamsResponse.data?.data || [];
          if (!mounted) return;
          setDashboardStats((current) => ({
            ...current,
            activeTeams: teams.length,
            leaderTeams: teams.filter((team) => team.currentUserLeader).length,
            nextDeadline: pickDeadline(teams),
            currentRound: teams.find((team) => team.currentRoundName || team.roundName)?.currentRoundName
              || teams.find((team) => team.roundName)?.roundName
              || "No round yet",
          }));
        }
      } catch {
        if (mounted) {
          setDashboardStats((current) => ({ ...current }));
        }
      }
    };

    loadDashboardStats();
    return () => {
      mounted = false;
    };
  }, [currentRole]);

  const renderContent = () => {
    if (activeKey === "directory") return <UserDirectoryPanel currentRole={currentRole} initialQuery={queryParam} />;
    if (activeKey === "account") return <UserProfilePanel onDirtyChange={setHasUnsavedProfileChanges} />;
    if (activeKey === "password") return <ChangePasswordPage />;

    if (currentRole === "COORDINATOR") {
      if (activeKey === "users") return <AccountApprovalPanel />;
      if (activeKey === "event-config") return <EventConfigurationPanel onDirtyChange={setHasUnsavedEventChanges} />;
      return null;
    }

    if (currentRole === "MENTOR") {
      if (activeKey === "mentor-teams") return <RoleWorkspacePanel role="MENTOR" type="teams" />;
      if (activeKey === "mentor-notes") return <RoleWorkspacePanel role="MENTOR" type="notes" />;
      return null;
    }

    if (currentRole === "JUDGE") {
      if (activeKey === "judge-rounds") return <RoleWorkspacePanel role="JUDGE" type="rounds" />;
      if (activeKey === "scoring") return <RoleWorkspacePanel role="JUDGE" type="scoring" />;
      return null;
    }

    if (activeKey === "teams") {
      return <TeamManagementPanel />;
    }
    return null;
  };

  const openProfileMenu = (event) => setProfileMenuAnchor(event.currentTarget);
  const closeProfileMenu = () => setProfileMenuAnchor(null);

  const jumpToSection = (key) => {
    if (!confirmLeaveCurrentView()) return;
    const nextParams = { section: key };
    if (key === "directory" && queryParam.trim()) {
      nextParams.query = queryParam.trim();
    }
    skipNextSearchGuardRef.current = true;
    setSearchParams(nextParams);
    closeProfileMenu();
    setMobileOpen(false);
  };

  const submitGlobalSearch = (event) => {
    event.preventDefault();
    const nextParams = { section: "directory" };
    if (globalSearch.trim()) {
      nextParams.query = globalSearch.trim();
    }
    if (!confirmLeaveCurrentView()) return;
    skipNextSearchGuardRef.current = true;
    setSearchParams(nextParams);
    setMobileOpen(false);
  };

  const runLogout = () => {
    closeProfileMenu();
    logout();
  };

  const onSelectNav = (key) => {
    jumpToSection(key);
  };

  const goToProfileHome = () => {
    if (!confirmLeaveCurrentView()) return;
    skipNextSearchGuardRef.current = true;
    setSearchParams({ section: "account" });
    closeProfileMenu();
    setMobileOpen(false);
  };

  const renderNavSection = (title, items) => (
    <Box>
      <Typography
        sx={{
          color: "#a0adb5",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.6,
          lineHeight: 1,
          px: 3,
          pt: 2,
          pb: 0.75,
          textTransform: "uppercase",
        }}
      >
        {title}
      </Typography>
      <List disablePadding>
        {items.map((item) => {
          const selected = activeKey === item.key;

          return (
            <ListItemButton
              key={item.key}
              selected={selected}
              onClick={() => onSelectNav(item.key)}
              sx={{
                minHeight: 40,
                mx: 1.5,
                my: 0.35,
                px: 2,
                py: 1.15,
                borderRadius: 3,
                color: selected ? "#FFFFFF" : brand.colors.text,
                bgcolor: selected ? brand.colors.navy : "transparent",
                boxShadow: selected ? "0 14px 28px rgba(7, 26, 47, 0.18)" : "none",
                transition: "background-color 160ms ease, color 160ms ease, transform 160ms ease, box-shadow 160ms ease",
                "&:hover": {
                  bgcolor: selected ? brand.colors.navy : brand.colors.surfaceWarm,
                  transform: "translateX(2px)",
                },
                "&.Mui-selected": {
                  bgcolor: brand.colors.navy,
                },
                "&.Mui-selected:hover": {
                  bgcolor: brand.colors.navy,
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 36,
                  color: selected ? "#FFFFFF" : brand.colors.muted,
                  "& .MuiSvgIcon-root": { fontSize: 20 },
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  color: "inherit",
                  fontSize: 14,
                  fontWeight: 500,
                  noWrap: true,
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  const sidePanel = (
    <Box
      className="ms-sidebar-inner"
      sx={{
        minHeight: "100%",
        bgcolor: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        onClick={goToProfileHome}
        sx={{
          height: 70,
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          px: 3,
          py: 2.5,
          borderBottom: "1px solid #f0f0f0",
          color: brand.colors.text,
          cursor: "pointer",
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 2,
            display: "grid",
            placeItems: "center",
            color: "#FFFFFF",
            background: brand.gradients.orange,
            flex: "0 0 32px",
          }}
        >
          <DomainVerificationRoundedIcon fontSize="small" />
        </Box>
        <Typography sx={{ color: brand.colors.text, fontSize: 20, fontWeight: 700, lineHeight: 1 }}>
          {APP_NAME}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", py: 0.75 }}>
        {coreNavItems.length ? renderNavSection("HOME", coreNavItems) : null}
      </Box>
    </Box>
  );

  const profileMenuItemSx = {
    mx: 0.75,
    my: 0.35,
    minHeight: 46,
    borderRadius: 2,
    gap: 1,
    color: brand.colors.text,
    fontWeight: 700,
    "& .MuiListItemIcon-root": {
      minWidth: 34,
      color: brand.colors.muted,
    },
    "&:hover": {
      bgcolor: brand.colors.surfaceWarm,
      color: brand.colors.navy,
      "& .MuiListItemIcon-root": { color: brand.colors.orange },
    },
  };

  return (
    <Box className="ms-shell" sx={{ display: "flex" }}>
      <Drawer
        variant="permanent"
        PaperProps={{
          className: "ms-sidebar",
          sx: {
            width: DRAWER_WIDTH,
            bgcolor: "#FFFFFF",
            borderRight: "1px solid #e5e7eb",
            boxShadow: "none",
          },
        }}
        sx={{ display: { xs: "none", lg: "block" }, width: DRAWER_WIDTH }}
        open
      >
        {sidePanel}
      </Drawer>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{
          className: "ms-sidebar",
          sx: {
            width: DRAWER_WIDTH,
            bgcolor: "#FFFFFF",
            borderRight: "1px solid #e5e7eb",
            boxShadow: "none",
          },
        }}
        sx={{ display: { xs: "block", lg: "none" } }}
      >
        {sidePanel}
      </Drawer>

      <Menu
        anchorEl={profileMenuAnchor}
        open={Boolean(profileMenuAnchor)}
        onClose={closeProfileMenu}
        disableScrollLock
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        MenuListProps={{ sx: { p: 0.75 } }}
        PaperProps={{
          sx: {
            mt: 1.2,
            width: 274,
            overflow: "hidden",
            borderRadius: 3,
            border: `1px solid ${brand.colors.line}`,
            boxShadow: "0 22px 60px rgba(7, 26, 47, 0.18)",
          },
        }}
      >
        <Box sx={{ px: 1.1, py: 1.2 }}>
          <Stack direction="row" spacing={1.2} alignItems="center">
            <Avatar
              src={withAssetVersion(resolveAssetUrl(profileSummary?.avatarUrl), profileSummary?.__avatarVersion) || undefined}
              sx={{ width: 42, height: 42, bgcolor: brand.colors.orange, fontSize: 13, fontWeight: 900 }}
            >
              {avatarInitials}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ color: brand.colors.text, fontSize: 14, fontWeight: 900, lineHeight: 1.2 }} noWrap>
                {profileSummary?.fullName || auth?.username || "Unknown"}
              </Typography>
              <Typography sx={{ color: brand.colors.muted, fontSize: 12, lineHeight: 1.2 }} noWrap>
                @{profileSummary?.username || auth?.username || ""}
              </Typography>
            </Box>
          </Stack>
        </Box>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={() => jumpToSection("account")} sx={profileMenuItemSx}>
          <ListItemIcon><PermIdentityRoundedIcon fontSize="small" /></ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem onClick={() => jumpToSection("password")} sx={profileMenuItemSx}>
          <ListItemIcon><LockRoundedIcon fontSize="small" /></ListItemIcon>
          Change Password
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={runLogout}
          sx={{
            ...profileMenuItemSx,
            color: brand.colors.danger,
            "& .MuiListItemIcon-root": { minWidth: 34, color: brand.colors.danger },
            "&:hover": {
              bgcolor: "#FFF1F0",
              color: brand.colors.danger,
              "& .MuiListItemIcon-root": { color: brand.colors.danger },
            },
          }}
        >
          <ListItemIcon sx={{ color: "error.main" }}><LogoutRoundedIcon fontSize="small" /></ListItemIcon>
          Logout
        </MenuItem>
      </Menu>

      <Box component="main" className="ms-content" sx={{ flexGrow: 1, minWidth: 0 }}>
        <AppBar
          position="sticky"
          className="ms-topbar"
          elevation={0}
          sx={{
            height: 72,
            bgcolor: "rgba(255,255,255,0.94)",
            color: brand.colors.text,
            borderBottom: "1px solid #e8edf7",
            boxShadow: "0 6px 22px rgba(42, 53, 71, 0.04)",
            backdropFilter: "blur(12px)",
          }}
        >
          <Container maxWidth={false} sx={{ height: "100%", px: { xs: 2, md: 3 } }}>
            <Toolbar disableGutters sx={{ justifyContent: "space-between", minHeight: "72px !important", gap: 2.5 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                <IconButton
                  onClick={() => setMobileOpen(true)}
                  sx={{
                    color: brand.colors.muted,
                    display: { xs: "inline-flex", lg: "none" },
                    width: 38,
                    height: 38,
                    "&:hover": { bgcolor: brand.colors.surfaceWarm, color: brand.colors.orange },
                  }}
                >
                  <MenuRoundedIcon />
                </IconButton>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h4" className="ms-page-title" noWrap sx={{ color: brand.colors.text, fontSize: 20, fontWeight: 800, letterSpacing: 0 }}>
                    {pageTitle}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                <Box
                  component="form"
                  onSubmit={submitGlobalSearch}
                  sx={{ display: { xs: "none", md: "block" }, width: { md: 280, lg: 360 } }}
                >
                  <TextField
                    size="small"
                    fullWidth
                    value={globalSearch}
                    onChange={(event) => setGlobalSearch(event.target.value)}
                    placeholder="Search users, teams, events..."
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchRoundedIcon sx={{ color: brand.colors.muted, fontSize: 20 }} />
                        </InputAdornment>
                      ),
                      sx: {
                        height: 40,
                        borderRadius: 40,
                        bgcolor: "#F8FAFF",
                        color: brand.colors.text,
                        "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e0e6f0" },
                        "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#cbd5e1" },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: brand.colors.orange },
                      },
                    }}
                  />
                </Box>
                <Button
                  onClick={openProfileMenu}
                  sx={{
                    minWidth: 0,
                    maxWidth: { xs: 48, sm: 238 },
                    height: 48,
                    px: { xs: 0.75, sm: 1.1 },
                    py: 0.5,
                    gap: 0.9,
                    borderRadius: 999,
                    textTransform: "none",
                    color: brand.colors.text,
                    border: "1px solid",
                    borderColor: profileMenuAnchor ? "rgba(243,112,33,0.45)" : "#dfe7f4",
                    bgcolor: profileMenuAnchor ? brand.colors.surfaceWarm : "#FFFFFF",
                    boxShadow: profileMenuAnchor ? "0 12px 28px rgba(7, 26, 47, 0.1)" : "none",
                    "&:hover": {
                      bgcolor: brand.colors.surfaceWarm,
                      borderColor: "#cbd5e1",
                    },
                  }}
                >
                  <Avatar
                    src={withAssetVersion(resolveAssetUrl(profileSummary?.avatarUrl), profileSummary?.__avatarVersion) || undefined}
                    sx={{ width: 32, height: 32, bgcolor: brand.colors.orange, border: `2px solid ${brand.colors.surfaceWarm}`, fontSize: 12, fontWeight: 800 }}
                  >
                    {avatarInitials}
                  </Avatar>
                  <Box sx={{ display: { xs: "none", sm: "block" }, minWidth: 0, flex: 1, textAlign: "left" }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 13, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {profileSummary?.fullName || auth?.username || "Unknown"}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: brand.colors.muted, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      @{profileSummary?.username || auth?.username || ""}
                    </Typography>
                  </Box>
                  <ExpandMoreRoundedIcon sx={{ color: brand.colors.muted, fontSize: 18, display: { xs: "none", sm: "block" } }} />
                </Button>
              </Stack>
            </Toolbar>
          </Container>
        </AppBar>

        <Container maxWidth={false} className="ms-page-body">
          <Box className="ms-breadcrumb">
            <HomeRoundedIcon sx={{ fontSize: 16 }} />
            <span>Dashboard</span>
            <span>/</span>
            <span style={{ color: brand.colors.text, fontWeight: 600 }}>{pageTitle}</span>
          </Box>

          <DashboardOverview
            auth={auth}
            currentRole={currentRole}
            profileSummary={profileSummary}
            avatarInitials={avatarInitials}
            stats={dashboardStats}
          />

          {renderContent()}
        </Container>
      </Box>
    </Box>
  );
}
